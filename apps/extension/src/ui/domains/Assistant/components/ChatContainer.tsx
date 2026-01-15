import { SettingsIcon, TalismanHandIcon, Trash2Icon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { type FC, useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { useAssistantChat } from "../hooks/useAssistantChat"
import { hasApiKey, removeApiKey, setApiKey } from "../llm/claudeClient"
import { clearMessages, useChatMessages } from "../state/chatMessages"
import { usePendingAction } from "../state/pendingActions"
import { ActionConfirmation } from "./ActionConfirmation"
import { ApiKeyModal } from "./ApiKeyModal"
import { ChatInput } from "./ChatInput"
import { ChatMessages } from "./ChatMessages"

export const ChatContainer: FC = () => {
  const { t } = useTranslation()
  const messages = useChatMessages()
  const pendingAction = usePendingAction()
  const [showApiKeyModal, setShowApiKeyModal] = useState(!hasApiKey())

  const { isLoading, error, sendMessage, confirmAction, cancelAction } = useAssistantChat()

  const handleClearChat = useCallback(() => {
    clearMessages()
  }, [])

  const handleApiKeySave = useCallback((key: string) => {
    setApiKey(key)
    setShowApiKeyModal(false)
  }, [])

  const handleRemoveApiKey = useCallback(() => {
    removeApiKey()
    setShowApiKeyModal(true)
  }, [])

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-grey-800 border-b px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-grey-800">
            <TalismanHandIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-semibold text-body text-sm">{t("Talisman Assistant")}</h1>
            <p className="text-body-secondary text-xs">{t("AI-powered portfolio management")}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <HeaderButton
            onClick={() => setShowApiKeyModal(true)}
            icon={<SettingsIcon className="h-4 w-4" />}
            label={t("Settings")}
          />
          <HeaderButton
            onClick={handleClearChat}
            icon={<Trash2Icon className="h-4 w-4" />}
            label={t("Clear")}
            disabled={messages.length === 0}
          />
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <ChatMessages messages={messages} isLoading={isLoading} onSuggestionClick={sendMessage} />
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mb-3 rounded-lg bg-red-500/10 px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Action Confirmation Modal */}
      {pendingAction && pendingAction.status === "pending_confirmation" && (
        <ActionConfirmation
          action={pendingAction}
          onConfirm={confirmAction}
          onCancel={cancelAction}
        />
      )}

      {/* API Key Modal */}
      {showApiKeyModal && (
        <ApiKeyModal
          onSave={handleApiKeySave}
          onCancel={() => hasApiKey() && setShowApiKeyModal(false)}
          hasExistingKey={hasApiKey()}
          onRemove={handleRemoveApiKey}
        />
      )}

      {/* Input Area */}
      <div className="border-grey-800 border-t p-4">
        <ChatInput
          onSend={sendMessage}
          disabled={isLoading || !!pendingAction || !hasApiKey()}
          placeholder={!hasApiKey() ? t("Configure your API key to start chatting") : undefined}
        />
      </div>
    </div>
  )
}

interface HeaderButtonProps {
  onClick: () => void
  icon: React.ReactNode
  label: string
  disabled?: boolean
}

const HeaderButton: FC<HeaderButtonProps> = ({ onClick, icon, label, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={classNames(
      "flex items-center gap-2 rounded-lg px-3 py-2 font-medium text-xs transition-colors",
      "text-body-secondary hover:bg-grey-800 hover:text-body",
      "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
    )}
    title={label}
  >
    {icon}
    <span className="hidden sm:inline">{label}</span>
  </button>
)
