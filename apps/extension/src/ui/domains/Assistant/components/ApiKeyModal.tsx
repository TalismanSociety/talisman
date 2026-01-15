import {
  AlertTriangleIcon,
  CheckIcon,
  ExternalLinkIcon,
  EyeIcon,
  EyeOffIcon,
  KeyIcon,
  Trash2Icon,
} from "@talismn/icons"
import { classNames } from "@talismn/util"
import { type FC, type FormEvent, useCallback, useState } from "react"
import { useTranslation } from "react-i18next"

interface ApiKeyModalProps {
  onSave: (key: string) => void
  onCancel: () => void
  hasExistingKey: boolean
  onRemove?: () => void
}

export const ApiKeyModal: FC<ApiKeyModalProps> = ({
  onSave,
  onCancel,
  hasExistingKey,
  onRemove,
}) => {
  const { t } = useTranslation()
  const [apiKey, setApiKey] = useState("")
  const [showKey, setShowKey] = useState(false)

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      if (apiKey.trim()) {
        onSave(apiKey.trim())
      }
    },
    [apiKey, onSave]
  )

  const isValidKey = apiKey.startsWith("sk-ant-") && apiKey.length > 20

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-grey-900 shadow-2xl">
        {/* Header */}
        <div className="border-grey-800/50 border-b bg-grey-800 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#fd4848] to-[#d5ff5c]">
              <KeyIcon className="h-5 w-5 text-grey-900" />
            </div>
            <div>
              <h2 className="font-semibold text-base text-body">
                {hasExistingKey ? t("Update API Key") : t("Connect to Claude")}
              </h2>
              <p className="text-body-secondary text-xs">{t("Provide your Anthropic API key")}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Input Field */}
          <div className="mb-5">
            <label
              htmlFor="apiKey"
              className="mb-2 block font-medium text-body-disabled text-xs uppercase tracking-wider"
            >
              {t("API Key")}
            </label>
            <div className="relative">
              <input
                id="apiKey"
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-api03-..."
                className={classNames(
                  "w-full rounded-xl border bg-grey-800/50 px-4 py-3 pr-12 font-mono text-sm",
                  "text-body placeholder:text-body-disabled",
                  "transition-colors focus:outline-none",
                  isValidKey
                    ? "border-[#d5ff5c]/50 focus:border-[#d5ff5c]"
                    : apiKey
                      ? "border-[#fd4848]/50 focus:border-[#fd4848]"
                      : "border-grey-700 focus:border-grey-600"
                )}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-body-secondary transition-colors hover:text-body"
              >
                {showKey ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            </div>
            {apiKey && !isValidKey && (
              <p className="mt-2 flex items-center gap-1.5 text-[#fd4848] text-xs">
                <AlertTriangleIcon className="h-3 w-3" />
                {t("API key should start with 'sk-ant-'")}
              </p>
            )}
            {isValidKey && (
              <p className="mt-2 flex items-center gap-1.5 text-[#d5ff5c] text-xs">
                <CheckIcon className="h-3 w-3" />
                {t("Valid API key format")}
              </p>
            )}
          </div>

          {/* Security Notice */}
          <div className="mb-6 rounded-xl border border-grey-800 bg-grey-800 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#fd4848]/10">
                <AlertTriangleIcon className="h-4 w-4 text-[#fd4848]" />
              </div>
              <div className="text-body-secondary text-xs">
                <p className="mb-1 font-medium text-body">{t("Security Notice")}</p>
                <p className="leading-relaxed">
                  {t(
                    "Your API key is stored locally and never sent to our servers. Keep it confidential."
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Get API Key Link */}
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="mb-6 flex items-center justify-center gap-2 rounded-xl border border-grey-700 bg-grey-800/30 px-4 py-3 text-body-secondary text-sm transition-colors hover:border-grey-600 hover:bg-grey-800 hover:text-body"
          >
            <ExternalLinkIcon className="h-4 w-4" />
            {t("Get an API key from Anthropic")}
          </a>

          {/* Actions */}
          <div className="flex gap-3">
            {hasExistingKey && onRemove && (
              <button
                type="button"
                onClick={onRemove}
                className="flex items-center gap-2 rounded-xl px-4 py-3 text-[#fd4848] text-sm transition-colors hover:bg-[#fd4848]/10"
              >
                <Trash2Icon className="h-4 w-4" />
              </button>
            )}
            <div className="ml-auto flex gap-3">
              {hasExistingKey && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex items-center gap-2 rounded-xl border border-grey-700 px-5 py-3 font-medium text-body text-sm transition-colors hover:bg-grey-800"
                >
                  {t("Cancel")}
                </button>
              )}
              <button
                type="submit"
                disabled={!isValidKey}
                className={classNames(
                  "flex items-center gap-2 rounded-xl px-5 py-3 font-medium text-sm",
                  "bg-gradient-to-r from-[#fd4848] to-[#d5ff5c] text-grey-900",
                  "transition-all hover:opacity-90 hover:shadow-lg",
                  "disabled:cursor-not-allowed disabled:opacity-40"
                )}
              >
                <CheckIcon className="h-4 w-4" />
                {t("Save Key")}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
