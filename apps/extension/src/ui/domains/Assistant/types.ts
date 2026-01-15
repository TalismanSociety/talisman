export type MessageRole = "user" | "assistant"

export interface ToolCall {
  id: string
  name: string
  input: Record<string, unknown>
  status: "pending" | "executing" | "completed" | "failed"
}

export interface ToolResult {
  toolCallId: string
  result: unknown
  error?: string
}

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: number
  toolCalls?: ToolCall[]
  toolResults?: ToolResult[]
  isStreaming?: boolean
}

export type ActionType = "swap" | "stake" | "transfer" | "rebalance"

export interface ActionPreview {
  summary: string
  details: Record<string, unknown>
  warnings?: string[]
  estimatedGas?: string
}

export interface PendingAction {
  id: string
  type: ActionType
  params: unknown
  preview: ActionPreview
  status: "pending_confirmation" | "executing" | "completed" | "failed" | "cancelled"
  error?: string
}

export interface ToolHandlerResult {
  success: boolean
  data?: unknown
  error?: string
  requiresConfirmation?: boolean
  actionId?: string
  message?: string
}

export type ToolHandler<TInput = unknown, TResult = ToolHandlerResult> = (
  input: TInput
) => Promise<TResult>
