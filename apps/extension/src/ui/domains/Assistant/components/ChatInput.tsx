import { SendIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import {
  type FC,
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import { useTranslation } from "react-i18next"

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export const ChatInput: FC<ChatInputProps> = ({ onSend, disabled = false, placeholder }) => {
  const { t } = useTranslation()
  const [message, setMessage] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [])

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      if (message.trim() && !disabled) {
        onSend(message.trim())
        setMessage("")
      }
    },
    [message, disabled, onSend]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        if (message.trim() && !disabled) {
          onSend(message.trim())
          setMessage("")
        }
      }
    },
    [message, disabled, onSend]
  )

  const canSend = message.trim() && !disabled

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div
        className={classNames(
          "flex items-end gap-2 rounded-lg border bg-black-tertiary p-1.5 transition-colors",
          disabled ? "border-grey-800" : "border-grey-700 focus-within:border-grey-600"
        )}
      >
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder || t("Message Talisman Assistant...")}
          className={classNames(
            "flex-1 resize-none bg-transparent px-3 py-2",
            "text-body text-sm placeholder:text-body-disabled",
            "focus:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "max-h-[120px] min-h-[36px]"
          )}
          rows={1}
        />
        <button
          type="submit"
          disabled={!canSend}
          className={classNames(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-all",
            canSend
              ? "bg-primary text-white hover:bg-primary-500"
              : "bg-grey-800 text-body-disabled",
            "disabled:cursor-not-allowed"
          )}
        >
          <SendIcon className="h-4 w-4" />
        </button>
      </div>
    </form>
  )
}
