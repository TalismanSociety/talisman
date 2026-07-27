import { PrfEvaluationError } from "@ui/util/webauthnPrf"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"

/**
 * Turns a failed WebAuthn ceremony into something we can show the user.
 *
 * Whether quick unlock works depends on the browser, the OS and the active passkey provider all
 * at once, so there is no version we could check upfront - we let the ceremony fail and explain why.
 *
 * Returns null when the user cancelled, in which case nothing should be shown.
 */
export const useQuickUnlockErrorMessage = () => {
  const { t } = useTranslation()

  return useCallback(
    (err: unknown): string | null => {
      // the ceremony worked, the authenticator just can't evaluate a PRF - it isn't the right kind
      // of authenticator, or the browser and OS are too old to expose the capability
      if (err instanceof PrfEvaluationError)
        return t(
          "This authenticator can't be used for quick unlock. Use your device's built-in authenticator, such as Touch ID, Windows Hello or your screen lock, and make sure your browser and operating system are up to date."
        )

      switch ((err as DOMException)?.name) {
        case "NotAllowedError":
        case "AbortError":
          return null

        case "SecurityError":
          return t("Your browser doesn't allow quick unlock from an extension page.")

        case "NotSupportedError":
        case "ConstraintError":
          return t("Your device doesn't support quick unlock.")

        default:
          // our own errors carry a useful explanation, anything else from the browser does not
          return err instanceof DOMException
            ? t("Quick unlock failed, please try again.")
            : ((err as Error)?.message ?? t("Quick unlock failed, please try again."))
      }
    },
    [t]
  )
}
