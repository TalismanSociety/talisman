import { UserCheckIcon } from "@talismn/icons"
import { api } from "@ui/api"
import { Setting } from "@ui/components/Setting"
import { Toggle } from "@ui/components/Toggle"
import { useSmartUnlockErrorMessage } from "@ui/hooks/useSmartUnlockErrorMessage"
import { useIsSmartUnlockEnrolled } from "@ui/state/smartUnlock"
import {
  createSmartUnlockCredential,
  isSmartUnlockAvailable,
  PrfEvaluationError,
  signalCredentialRemoved,
} from "@ui/util/webauthnPrf"
import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

export const SmartUnlockSetting = () => {
  const { t } = useTranslation()
  const enrolled = useIsSmartUnlockEnrolled()
  const [available, setAvailable] = useState<boolean | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string>()
  const getErrorMessage = useSmartUnlockErrorMessage()

  const abortRef = useRef<AbortController>(null)

  useEffect(() => {
    isSmartUnlockAvailable().then(setAvailable)
    // abandon any ceremony still waiting on the user
    return () => abortRef.current?.abort()
  }, [])

  const handleToggle = useCallback(
    async (checked: boolean) => {
      setProcessing(true)
      setError(undefined)
      abortRef.current?.abort()
      const abort = new AbortController()
      abortRef.current = abort
      try {
        if (checked) {
          const credential = await createSmartUnlockCredential(abort.signal)
          try {
            await api.smartUnlockEnroll(credential)
          } catch (err) {
            // the passkey exists but we can't use it, don't leave it behind. removal is best-effort
            // though, so tell the user where to find it if the authenticator keeps it
            await signalCredentialRemoved(credential.credentialId)
            setError(
              t(
                "{{reason}} A passkey may have been created, you can remove it from your system settings.",
                { reason: getErrorMessage(err) ?? t("Smart unlock could not be enabled.") }
              )
            )
            return
          }
        } else {
          // read the credential before dropping it, so we can ask the authenticator to forget it too
          const credentialInfo = await api.smartUnlockGetCredentialInfo()
          await api.smartUnlockUnenroll()
          if (credentialInfo) await signalCredentialRemoved(credentialInfo.credentialId)
        }
      } catch (err) {
        // resolves to null if the user cancelled the smart unlock prompt, or if we abandoned it
        const message = getErrorMessage(err)

        // a passkey was created before we found out the authenticator can't evaluate a PRF, and
        // removing it again is only best-effort
        if (message && err instanceof PrfEvaluationError)
          setError(
            t(
              "{{reason}} A passkey may have been created, you can remove it from your system settings.",
              { reason: message }
            )
          )
        else setError(message ?? undefined)
      } finally {
        setProcessing(false)
      }
    },
    [getErrorMessage, t]
  )

  // keep the setting visible while enrolled even if the authenticator became unavailable,
  // it's the only place where the enrollment can be cleared
  if (!available && !enrolled) return null

  return (
    <Setting
      iconLeft={UserCheckIcon}
      title={t("Smart unlock")}
      subtitle={
        error ? (
          <span className="text-alert-warn">{error}</span>
        ) : available ? (
          t("Use Touch ID, Windows Hello or your device's screen lock to unlock your wallet")
        ) : (
          t("The enrolled authenticator is unavailable, turn this off to stop using it.")
        )
      }
    >
      <Toggle
        checked={enrolled}
        onChange={(e) => handleToggle(e.target.checked)}
        disabled={processing}
      />
    </Setting>
  )
}
