import { bind } from "@react-rxjs/core"
import { BehaviorSubject, map, shareReplay } from "rxjs"

import type { ChatMessage, ToolCall, ToolResult } from "../types"

const messagesSubject$ = new BehaviorSubject<ChatMessage[]>([])

export const [useChatMessages, chatMessages$] = bind(
  messagesSubject$.pipe(
    map((messages) => messages.sort((a, b) => a.timestamp - b.timestamp)),
    shareReplay({ bufferSize: 1, refCount: true })
  ),
  []
)

export const addMessage = (message: Omit<ChatMessage, "id" | "timestamp">): ChatMessage => {
  const newMessage: ChatMessage = {
    ...message,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  }
  messagesSubject$.next([...messagesSubject$.getValue(), newMessage])
  return newMessage
}

export const updateMessage = (id: string, updates: Partial<ChatMessage>): void => {
  const messages = messagesSubject$.getValue()
  const index = messages.findIndex((m) => m.id === id)
  if (index >= 0) {
    const updatedMessages = [...messages]
    updatedMessages[index] = { ...messages[index], ...updates }
    messagesSubject$.next(updatedMessages)
  }
}

export const updateMessageToolCall = (
  messageId: string,
  toolCallId: string,
  updates: Partial<ToolCall>
): void => {
  const messages = messagesSubject$.getValue()
  const messageIndex = messages.findIndex((m) => m.id === messageId)
  if (messageIndex >= 0) {
    const message = messages[messageIndex]
    const updatedToolCalls = message.toolCalls?.map((tc) =>
      tc.id === toolCallId ? { ...tc, ...updates } : tc
    )
    const updatedMessages = [...messages]
    updatedMessages[messageIndex] = { ...message, toolCalls: updatedToolCalls }
    messagesSubject$.next(updatedMessages)
  }
}

export const addToolResult = (messageId: string, toolResult: ToolResult): void => {
  const messages = messagesSubject$.getValue()
  const messageIndex = messages.findIndex((m) => m.id === messageId)
  if (messageIndex >= 0) {
    const message = messages[messageIndex]
    const updatedMessages = [...messages]
    updatedMessages[messageIndex] = {
      ...message,
      toolResults: [...(message.toolResults || []), toolResult],
    }
    messagesSubject$.next(updatedMessages)
  }
}

export const clearMessages = (): void => {
  messagesSubject$.next([])
}

export const getMessages = (): ChatMessage[] => {
  return messagesSubject$.getValue()
}
