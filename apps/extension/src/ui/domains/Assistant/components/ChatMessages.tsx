import {
  BarChartIcon,
  CoinsIcon,
  CreditCardIcon,
  RepeatIcon,
  TalismanHandIcon,
} from "@talismn/icons"
import { type FC, useCallback, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"

import type { ChatMessage as ChatMessageType } from "../types"
import { ChatMessage } from "./ChatMessage"

interface ChatMessagesProps {
  messages: ChatMessageType[]
  isLoading?: boolean
  onSuggestionClick?: (text: string) => void
}

export const ChatMessages: FC<ChatMessagesProps> = ({ messages, isLoading, onSuggestionClick }) => {
  const { t } = useTranslation()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 py-8">
        {/* Hero Section */}
        <div className="mb-6 flex flex-col items-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-grey-800">
            <TalismanHandIcon className="h-6 w-6 text-primary" />
          </div>
          <h2 className="mb-1 font-semibold text-body text-lg">{t("How can I help you today?")}</h2>
          <p className="max-w-sm text-center text-body-secondary text-sm">
            {t(
              "I can help manage your portfolio, execute swaps, stake tokens, and analyze transactions."
            )}
          </p>
        </div>

        {/* Capability Cards */}
        <div className="mb-6 grid w-full max-w-lg grid-cols-2 gap-2">
          <CapabilityCard
            icon={<CoinsIcon className="h-4 w-4" />}
            title={t("Portfolio")}
            description={t("Check balances")}
          />
          <CapabilityCard
            icon={<RepeatIcon className="h-4 w-4" />}
            title={t("Swap")}
            description={t("Exchange tokens")}
          />
          <CapabilityCard
            icon={<CreditCardIcon className="h-4 w-4" />}
            title={t("Staking")}
            description={t("Earn rewards")}
          />
          <CapabilityCard
            icon={<BarChartIcon className="h-4 w-4" />}
            title={t("Analytics")}
            description={t("View history")}
          />
        </div>

        {/* Suggestion Chips */}
        <div className="w-full max-w-lg">
          <p className="mb-2 text-center text-body-disabled text-xs">{t("Try asking")}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <SuggestionChip text={t("What's my portfolio worth?")} onClick={onSuggestionClick} />
            <SuggestionChip text={t("Show my ETH balance")} onClick={onSuggestionClick} />
            <SuggestionChip text={t("Swap 0.1 ETH to USDC")} onClick={onSuggestionClick} />
            <SuggestionChip text={t("Staking options for DOT")} onClick={onSuggestionClick} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 px-6 py-6">
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  )
}

interface CapabilityCardProps {
  icon: React.ReactNode
  title: string
  description: string
}

const CapabilityCard: FC<CapabilityCardProps> = ({ icon, title, description }) => (
  <div className="flex items-center gap-3 rounded-lg border border-grey-800 bg-grey-800/30 px-3 py-2.5 transition-colors hover:border-grey-700">
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-grey-800 text-body-secondary">
      {icon}
    </div>
    <div className="min-w-0">
      <h3 className="font-medium text-body text-sm">{title}</h3>
      <p className="text-body-secondary text-xs">{description}</p>
    </div>
  </div>
)

interface SuggestionChipProps {
  text: string
  onClick?: (text: string) => void
}

const SuggestionChip: FC<SuggestionChipProps> = ({ text, onClick }) => {
  const handleClick = useCallback(() => {
    onClick?.(text)
  }, [onClick, text])

  return (
    <button
      type="button"
      onClick={handleClick}
      className="rounded-full border border-grey-700 px-3 py-1.5 text-body-secondary text-xs transition-colors hover:border-grey-600 hover:text-body"
    >
      {text}
    </button>
  )
}
