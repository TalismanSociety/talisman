import type { MessageParam, Tool } from "@anthropic-ai/sdk/resources/messages"

export interface StreamCallbacks {
  onText: (text: string) => void
  onToolUse: (toolCall: { id: string; name: string; input: Record<string, unknown> }) => void
  onToolInputDelta: (toolCallId: string, inputDelta: string) => void
  onComplete: () => void
  onError: (error: Error) => void
}

export interface ClaudeMessage {
  role: "user" | "assistant"
  content: string | MessageParam["content"]
}

export interface ToolDefinition extends Tool {
  name: string
  description: string
  input_schema: {
    type: "object"
    properties: Record<string, unknown>
    required?: string[]
  }
}

export const WRITE_TOOLS = [
  "execute_swap",
  "execute_stake",
  "send_tokens",
  "rebalance_portfolio",
] as const

export type WriteTool = (typeof WRITE_TOOLS)[number]

export const isWriteTool = (toolName: string): toolName is WriteTool => {
  return WRITE_TOOLS.includes(toolName as WriteTool)
}
