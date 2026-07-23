import { useCallback } from "react"
import { useTranslation } from "react-i18next"

/**
 * Turns a failed WebAuthn ceremony into something we can show the user.
 *
 * Whether biometric unlock works depends on the browser, the OS and the active passkey provider all
 * at once, so there is no version we could check upfront - we let the ceremony fail and explain why.
 *
 * Returns null when the user cancelled, in which case nothing should be shown.
 */
export const useBiometricErrorMessage = () => {
  const { t } = useTranslation()

  return useCallback(
    (err: unknown): string | null => {
      switch ((err as DOMException)?.name) {
        case "NotAllowedError":
        case "AbortError":
          return null

        case "SecurityError":
          return t("Your browser doesn't allow biometric unlock from an extension page.")

        case "NotSupportedError":
        case "ConstraintError":
          return t("Your device doesn't support biometric unlock.")

        default:
          // our own errors carry a useful explanation, anything else from the browser does not
          return err instanceof DOMException
            ? t("Biometric unlock failed, please try again.")
            : ((err as Error)?.message ?? t("Biometric unlock failed, please try again."))
      }
    },
    [t]
  )
}
