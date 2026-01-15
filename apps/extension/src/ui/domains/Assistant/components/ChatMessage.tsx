import {
  AlertCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  LoaderIcon,
  TalismanHandIcon,
  UserIcon,
} from "@talismn/icons"
import { classNames } from "@talismn/util"
import { type FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

import type { ChatMessage as ChatMessageType } from "../types"

interface ChatMessageProps {
  message: ChatMessageType
}

export const ChatMessage: FC<ChatMessageProps> = ({ message }) => {
  const { t } = useTranslation()
  const isUser = message.role === "user"

  const formattedTime = useMemo(() => {
    return new Date(message.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  }, [message.timestamp])

  return (
    <div
      className={classNames("group flex w-full gap-3", isUser ? "flex-row-reverse" : "flex-row")}
    >
      {/* Avatar */}
      <div
        className={classNames(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-grey-800 text-body-secondary" : "bg-grey-800"
        )}
      >
        {isUser ? (
          <UserIcon className="h-4 w-4" />
        ) : (
          <TalismanHandIcon className="h-5 w-5 text-primary" />
        )}
      </div>

      {/* Message content */}
      <div
        className={classNames(
          "flex max-w-[75%] flex-col gap-1.5",
          isUser ? "items-end" : "items-start"
        )}
      >
        {/* Role label */}
        <span className="font-medium text-[11px] text-body-disabled uppercase tracking-wider">
          {isUser ? t("You") : t("Talisman")}
        </span>

        <div
          className={classNames(
            "rounded-2xl px-4 py-2.5",
            isUser ? "rounded-br-sm bg-grey-700 text-body" : "rounded-bl-sm bg-grey-800 text-body",
            message.isStreaming && !message.content && "min-w-[60px]"
          )}
        >
          {message.content ? (
            <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
              {message.content}
            </div>
          ) : message.isStreaming ? (
            <div className="flex items-center gap-1.5 py-0.5">
              <div className="h-2 w-2 animate-pulse rounded-full bg-body-secondary" />
              <div
                className="h-2 w-2 animate-pulse rounded-full bg-body-secondary"
                style={{ animationDelay: "0.15s" }}
              />
              <div
                className="h-2 w-2 animate-pulse rounded-full bg-body-secondary"
                style={{ animationDelay: "0.3s" }}
              />
            </div>
          ) : null}
        </div>

        {/* Tool calls indicator */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.toolCalls.map((tool) => (
              <div
                key={tool.id}
                className={classNames(
                  "flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium text-[11px]",
                  tool.status === "pending" && "bg-grey-800 text-body-secondary",
                  tool.status === "executing" && "bg-[#fd4848]/10 text-[#fd4848]",
                  tool.status === "completed" && "bg-[#d5ff5c]/10 text-[#d5ff5c]",
                  tool.status === "failed" && "bg-red-500/10 text-red-400"
                )}
              >
                <ToolStatusIcon status={tool.status} />
                {formatToolName(tool.name)}
              </div>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <span className="text-[10px] text-body-disabled opacity-0 transition-opacity group-hover:opacity-100">
          {formattedTime}
        </span>
      </div>
    </div>
  )
}

const ToolStatusIcon: FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case "pending":
      return <ClockIcon className="h-3 w-3" />
    case "executing":
      return <LoaderIcon className="h-3 w-3 animate-spin" />
    case "completed":
      return <CheckCircleIcon className="h-3 w-3" />
    case "failed":
      return <AlertCircleIcon className="h-3 w-3" />
    default:
      return null
  }
}

function formatToolName(name: string): string {
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}
