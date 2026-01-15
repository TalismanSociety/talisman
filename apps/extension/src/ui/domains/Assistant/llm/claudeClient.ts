import Anthropic from "@anthropic-ai/sdk"
import type {
  ContentBlock,
  MessageParam,
  TextBlock,
  ToolResultBlockParam,
  ToolUseBlock,
} from "@anthropic-ai/sdk/resources/messages"
import { SYSTEM_PROMPT } from "./systemPrompt"
import { assistantTools } from "./toolDefinitions"
import type { StreamCallbacks } from "./types"

// For now, store API key in localStorage - in production, use secure extension storage
const API_KEY_STORAGE_KEY = "talisman_assistant_api_key"

export const getApiKey = (): string | null => {
  return localStorage.getItem(API_KEY_STORAGE_KEY)
}

export const setApiKey = (key: string): void => {
  localStorage.setItem(API_KEY_STORAGE_KEY, key)
}

export const removeApiKey = (): void => {
  localStorage.removeItem(API_KEY_STORAGE_KEY)
}

export const hasApiKey = (): boolean => {
  return !!getApiKey()
}

const createClient = (): Anthropic | null => {
  const apiKey = getApiKey()
  if (!apiKey) return null

  return new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true, // Required for browser extension context
  })
}

export interface ConversationMessage {
  role: "user" | "assistant"
  content: string | ContentBlock[] | ToolResultBlockParam[]
}

export const sendMessage = async (
  messages: ConversationMessage[],
  callbacks: StreamCallbacks
): Promise<void> => {
  const client = createClient()
  if (!client) {
    callbacks.onError(new Error("API key not configured. Please set your Anthropic API key."))
    return
  }

  // Convert our message format to Anthropic format
  const anthropicMessages: MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }))

  try {
    const stream = client.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: assistantTools,
      messages: anthropicMessages,
    })

    let currentText = ""
    const _toolInputBuffers: Record<string, string> = {}

    stream.on("text", (text) => {
      currentText += text
      callbacks.onText(currentText)
    })

    stream.on("contentBlock", (block) => {
      if (block.type === "tool_use") {
        const toolBlock = block as ToolUseBlock
        callbacks.onToolUse({
          id: toolBlock.id,
          name: toolBlock.name,
          input: toolBlock.input as Record<string, unknown>,
        })
      }
    })

    stream.on("inputJson", (_delta, _snapshot) => {
      // Track tool input as it streams
      // This is called during tool_use blocks
    })

    stream.on("error", (error) => {
      callbacks.onError(error)
    })

    stream.on("end", () => {
      callbacks.onComplete()
    })

    // Wait for the stream to complete
    await stream.finalMessage()
  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error("Unknown error"))
  }
}

export const sendMessageWithToolResults = async (
  messages: ConversationMessage[],
  toolResults: ToolResultBlockParam[],
  callbacks: StreamCallbacks
): Promise<void> => {
  const client = createClient()
  if (!client) {
    callbacks.onError(new Error("API key not configured"))
    return
  }

  // Build messages with tool results
  const anthropicMessages: MessageParam[] = [
    ...messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    {
      role: "user" as const,
      content: toolResults,
    },
  ]

  try {
    const stream = client.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: assistantTools,
      messages: anthropicMessages,
    })

    let currentText = ""

    stream.on("text", (text) => {
      currentText += text
      callbacks.onText(currentText)
    })

    stream.on("contentBlock", (block) => {
      if (block.type === "tool_use") {
        const toolBlock = block as ToolUseBlock
        callbacks.onToolUse({
          id: toolBlock.id,
          name: toolBlock.name,
          input: toolBlock.input as Record<string, unknown>,
        })
      }
    })

    stream.on("error", (error) => {
      callbacks.onError(error)
    })

    stream.on("end", () => {
      callbacks.onComplete()
    })

    await stream.finalMessage()
  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error("Unknown error"))
  }
}

// Helper to extract text content from a message
export const extractTextContent = (content: string | ContentBlock[]): string => {
  if (typeof content === "string") return content
  return content
    .filter((block): block is TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
}

// Helper to extract tool use blocks from a message
export const extractToolUseBlocks = (content: ContentBlock[]): ToolUseBlock[] => {
  return content.filter((block): block is ToolUseBlock => block.type === "tool_use")
}
