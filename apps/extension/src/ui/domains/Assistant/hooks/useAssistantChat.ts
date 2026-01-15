import type {
  ContentBlock,
  TextBlock,
  ToolResultBlockParam,
  ToolUseBlock,
} from "@anthropic-ai/sdk/resources/messages"
import { useCallback, useState } from "react"
import { type ApprovalData, executeAction } from "../actions"
import {
  type ConversationMessage,
  sendMessage as sendClaudeMessage,
  sendMessageWithToolResults,
} from "../llm/claudeClient"
import { isWriteTool } from "../llm/types"
import {
  addMessage,
  addToolResult,
  getMessages,
  updateMessage,
  updateMessageToolCall,
  useChatMessages,
} from "../state/chatMessages"
import {
  cancelAction as cancelPendingAction,
  completeAction,
  confirmAction as confirmPendingAction,
  usePendingAction,
} from "../state/pendingActions"
import { executeToolCall } from "../tools"
import type { ChatMessage, ToolCall } from "../types"

/**
 * Builds conversation history in Claude's expected format.
 * Converts internal ChatMessage format to ConversationMessage format,
 * properly handling tool_use and tool_result blocks.
 */
const buildConversationHistory = (
  messages: ChatMessage[],
  excludeMessageId?: string
): ConversationMessage[] => {
  const conversation: ConversationMessage[] = []

  for (const message of messages) {
    if (message.id === excludeMessageId) continue

    if (message.role === "user") {
      // User messages are simple text
      conversation.push({
        role: "user",
        content: message.content,
      })
    } else if (message.role === "assistant") {
      // Check if this assistant message has tool calls
      if (message.toolCalls && message.toolCalls.length > 0) {
        // Build content blocks array with text (if any) and tool_use blocks
        const contentBlocks: ContentBlock[] = []

        if (message.content) {
          contentBlocks.push({
            type: "text",
            text: message.content,
          } as TextBlock)
        }

        for (const tc of message.toolCalls) {
          contentBlocks.push({
            type: "tool_use",
            id: tc.id,
            name: tc.name,
            input: tc.input,
          } as ToolUseBlock)
        }

        conversation.push({
          role: "assistant",
          content: contentBlocks,
        })

        // If this message has tool results, add them as a user message
        if (message.toolResults && message.toolResults.length > 0) {
          const toolResultBlocks: ToolResultBlockParam[] = message.toolResults.map((tr) => ({
            type: "tool_result" as const,
            tool_use_id: tr.toolCallId,
            content: JSON.stringify(tr.error ? { success: false, error: tr.error } : tr.result),
          }))

          conversation.push({
            role: "user",
            content: toolResultBlocks,
          })
        }
      } else {
        // Simple assistant message without tool calls
        conversation.push({
          role: "assistant",
          content: message.content,
        })
      }
    }
  }

  return conversation
}

export const useAssistantChat = () => {
  const messages = useChatMessages()
  const pendingAction = usePendingAction()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleToolCalls = useCallback(
    async (messageId: string, toolCalls: ToolCall[]): Promise<ToolResultBlockParam[]> => {
      const toolResults: ToolResultBlockParam[] = []

      for (const toolCall of toolCalls) {
        // Mark tool as executing
        updateMessageToolCall(messageId, toolCall.id, { status: "executing" })

        try {
          const result = await executeToolCall(toolCall.name, toolCall.input)

          // Mark tool as completed
          updateMessageToolCall(messageId, toolCall.id, { status: "completed" })
          addToolResult(messageId, {
            toolCallId: toolCall.id,
            result,
          })

          // If it's a write tool that requires confirmation, we'll wait for user
          if (isWriteTool(toolCall.name) && result.requiresConfirmation) {
            // The tool already set up the pending action
            // Return a result indicating we're waiting for confirmation
            toolResults.push({
              type: "tool_result",
              tool_use_id: toolCall.id,
              content: JSON.stringify({
                status: "awaiting_confirmation",
                message: result.message,
              }),
            })
          } else {
            toolResults.push({
              type: "tool_result",
              tool_use_id: toolCall.id,
              content: JSON.stringify(result),
            })
          }
        } catch (err) {
          updateMessageToolCall(messageId, toolCall.id, { status: "failed" })
          addToolResult(messageId, {
            toolCallId: toolCall.id,
            result: null,
            error: err instanceof Error ? err.message : "Unknown error",
          })

          toolResults.push({
            type: "tool_result",
            tool_use_id: toolCall.id,
            content: JSON.stringify({
              success: false,
              error: err instanceof Error ? err.message : "Unknown error",
            }),
          })
        }
      }

      return toolResults
    },
    []
  )

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return

      setIsLoading(true)
      setError(null)

      // Add user message
      addMessage({ role: "user", content })

      // Add placeholder assistant message for streaming
      const assistantMessage = addMessage({
        role: "assistant",
        content: "",
        isStreaming: true,
      })

      const pendingToolCalls: ToolCall[] = []

      // Build conversation history for Claude with proper tool_use and tool_result formatting
      const conversationMessages = buildConversationHistory(
        getMessages(),
        assistantMessage.id // Exclude the placeholder
      )

      try {
        await sendClaudeMessage(conversationMessages, {
          onText: (text) => {
            updateMessage(assistantMessage.id, { content: text })
          },
          onToolUse: (toolCall) => {
            const newToolCall: ToolCall = {
              ...toolCall,
              status: "pending",
            }
            pendingToolCalls.push(newToolCall)
            updateMessage(assistantMessage.id, {
              toolCalls: [...pendingToolCalls],
            })
          },
          onToolInputDelta: () => {
            // Tool input streaming - we can update the UI here if needed
          },
          onComplete: async () => {
            updateMessage(assistantMessage.id, { isStreaming: false })

            // Execute any tool calls
            if (pendingToolCalls.length > 0) {
              const toolResults = await handleToolCalls(assistantMessage.id, pendingToolCalls)

              // Check if any tool is waiting for confirmation
              const hasConfirmationPending = pendingToolCalls.some(
                (tc) =>
                  isWriteTool(tc.name) &&
                  toolResults.some((tr) => {
                    if (tr.tool_use_id === tc.id && typeof tr.content === "string") {
                      try {
                        const parsed = JSON.parse(tr.content)
                        return parsed.status === "awaiting_confirmation"
                      } catch {
                        return false
                      }
                    }
                    return false
                  })
              )

              // If there's a confirmation pending, don't continue the conversation yet
              if (hasConfirmationPending) {
                setIsLoading(false)
                return
              }

              // Continue conversation with tool results using recursive agentic loop
              if (toolResults.length > 0) {
                // Helper function to continue conversation and handle nested tool calls
                const continueWithToolResults = async (
                  conversation: ConversationMessage[],
                  results: ToolResultBlockParam[],
                  previousToolCalls: ToolCall[],
                  previousMessageContent: string
                ): Promise<void> => {
                  const followUpMessage = addMessage({
                    role: "assistant",
                    content: "",
                    isStreaming: true,
                  })

                  // Build assistant message with tool_use blocks
                  const assistantContentBlocks: ContentBlock[] = []

                  // Add text block if there's any text content
                  if (previousMessageContent) {
                    assistantContentBlocks.push({
                      type: "text",
                      text: previousMessageContent,
                    } as TextBlock)
                  }

                  // Add tool_use blocks for each tool call
                  for (const tc of previousToolCalls) {
                    assistantContentBlocks.push({
                      type: "tool_use",
                      id: tc.id,
                      name: tc.name,
                      input: tc.input,
                    } as ToolUseBlock)
                  }

                  const updatedConversation: ConversationMessage[] = [
                    ...conversation,
                    {
                      role: "assistant" as const,
                      content: assistantContentBlocks,
                    },
                  ]

                  // Track nested tool calls
                  const nestedToolCalls: ToolCall[] = []

                  await sendMessageWithToolResults(updatedConversation, results, {
                    onText: (text) => {
                      updateMessage(followUpMessage.id, { content: text })
                    },
                    onToolUse: (toolCall) => {
                      const newToolCall: ToolCall = {
                        ...toolCall,
                        status: "pending",
                      }
                      nestedToolCalls.push(newToolCall)
                      updateMessage(followUpMessage.id, {
                        toolCalls: [...nestedToolCalls],
                      })
                    },
                    onToolInputDelta: () => {},
                    onComplete: async () => {
                      updateMessage(followUpMessage.id, { isStreaming: false })

                      // If there are nested tool calls, execute them and continue the loop
                      if (nestedToolCalls.length > 0) {
                        const nestedToolResults = await handleToolCalls(
                          followUpMessage.id,
                          nestedToolCalls
                        )

                        // Check if any tool is waiting for confirmation
                        const hasNestedConfirmationPending = nestedToolCalls.some(
                          (tc) =>
                            isWriteTool(tc.name) &&
                            nestedToolResults.some((tr) => {
                              if (tr.tool_use_id === tc.id && typeof tr.content === "string") {
                                try {
                                  const parsed = JSON.parse(tr.content)
                                  return parsed.status === "awaiting_confirmation"
                                } catch {
                                  return false
                                }
                              }
                              return false
                            })
                        )

                        if (hasNestedConfirmationPending) {
                          setIsLoading(false)
                          return
                        }

                        if (nestedToolResults.length > 0) {
                          // Get current message content for the next round
                          const currentMessages = getMessages()
                          const currentFollowUp = currentMessages.find(
                            (m) => m.id === followUpMessage.id
                          )

                          // Build conversation that includes the current tool_result
                          // This ensures Claude sees: [..., assistant{tool_use}, user{tool_result}, ...]
                          const conversationWithToolResult: ConversationMessage[] = [
                            ...updatedConversation,
                            {
                              role: "user" as const,
                              content: results, // Current round's tool results
                            },
                          ]

                          // Recursively continue with nested tool results
                          await continueWithToolResults(
                            conversationWithToolResult,
                            nestedToolResults,
                            nestedToolCalls,
                            currentFollowUp?.content || ""
                          )
                          return
                        }
                      }

                      setIsLoading(false)
                    },
                    onError: (err) => {
                      setError(err.message)
                      updateMessage(followUpMessage.id, { isStreaming: false })
                      setIsLoading(false)
                    },
                  })
                }

                // Start the agentic loop
                await continueWithToolResults(
                  conversationMessages,
                  toolResults,
                  pendingToolCalls,
                  assistantMessage.content
                )
                return
              }
            }

            setIsLoading(false)
          },
          onError: (err) => {
            setError(err.message)
            updateMessage(assistantMessage.id, {
              isStreaming: false,
              content: "Sorry, I encountered an error. Please try again.",
            })
            setIsLoading(false)
          },
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
        setIsLoading(false)
      }
    },
    [handleToolCalls]
  )

  const [isExecuting, setIsExecuting] = useState(false)
  const [pendingApproval, setPendingApprovalState] = useState<ApprovalData | null>(null)

  const handleApprovalNeeded = useCallback(async (approvalData: ApprovalData): Promise<boolean> => {
    // For now, auto-approve with the exact amount
    // In the future, this could show a UI prompt
    setPendingApprovalState(approvalData)
    // Auto-approve for assistant interactions
    return true
  }, [])

  const confirmAction = useCallback(async () => {
    if (!pendingAction) return

    const confirmed = await confirmPendingAction(pendingAction.id)
    if (!confirmed) return

    setIsExecuting(true)
    setPendingApprovalState(null)

    try {
      const result = await executeAction(pendingAction, {
        onApprovalNeeded: handleApprovalNeeded,
        onTradeProgress: (_completed, _total, _currentTrade) => {},
      })

      if (result.success) {
        completeAction(pendingAction.id, true)

        // Build success message with transaction hash if available
        let successMessage = `Transaction completed successfully! ${pendingAction.preview.summary}`
        if (result.hash) {
          successMessage += ` Transaction hash: ${result.hash}`
        }

        addMessage({
          role: "assistant",
          content: successMessage,
        })
      } else {
        completeAction(pendingAction.id, false, result.error)

        addMessage({
          role: "assistant",
          content: `Transaction failed: ${result.error || "Unknown error"}`,
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      completeAction(pendingAction.id, false, errorMessage)

      addMessage({
        role: "assistant",
        content: `Transaction failed: ${errorMessage}`,
      })
    } finally {
      setIsExecuting(false)
      setPendingApprovalState(null)
    }
  }, [pendingAction, handleApprovalNeeded])

  const cancelAction = useCallback(() => {
    if (pendingAction) {
      cancelPendingAction(pendingAction.id)

      // Add cancellation message
      addMessage({
        role: "assistant",
        content: "Transaction cancelled.",
      })
    }
  }, [pendingAction])

  return {
    messages,
    isLoading,
    isExecuting,
    error,
    pendingAction,
    pendingApproval,
    sendMessage,
    confirmAction,
    cancelAction,
  }
}
