import { notify } from "@ui/components/Notifications"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"

export const useCopyToClipboard = () => {
  const { t } = useTranslation()

  const toastId = `copy_${crypto.randomUUID()}`

  return useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text)
        notify(
          {
            type: "success",
            title: t(`Copied to clipboard`),
            subtitle: text,
          },
          // set an id to prevent multiple clicks to display multiple notifications
          { toastId }
        )
        return true
      } catch {
        notify(
          {
            type: "error",
            title: t(`Copy failed`),
          },
          { toastId }
        )
        return false
      }
    },
    [t, toastId]
  )
}
