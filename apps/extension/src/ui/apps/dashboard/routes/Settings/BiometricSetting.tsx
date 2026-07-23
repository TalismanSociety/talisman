import { UserCheckIcon } from "@talismn/icons"
import { api } from "@ui/api"
import { Setting } from "@ui/components/Setting"
import { Toggle } from "@ui/components/Toggle"
import { useBiometricErrorMessage } from "@ui/hooks/useBiometricErrorMessage"
import { useIsBiometricEnrolled } from "@ui/state/biometric"
import {
  createBiometricCredential,
  isBiometricAvailable,
  signalCredentialRemoved,
} from "@ui/util/webauthnPrf"
import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

export const BiometricSetting = () => {
  const { t } = useTranslation()
  const enrolled = useIsBiometricEnrolled()
  const [available, setAvailable] = useState<boolean | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string>()
  const [showRemoveHint, setShowRemoveHint] = useState(false)
  const getErrorMessage = useBiometricErrorMessage()

  const abortRef = useRef<AbortController>(null)

  useEffect(() => {
    isBiometricAvailable().then(setAvailable)
    // abandon any ceremony still waiting on the user
    return () => abortRef.current?.abort()
  }, [])

  const handleToggle = useCallback(
    async (checked: boolean) => {
      setProcessing(true)
      setError(undefined)
      setShowRemoveHint(false)
      abortRef.current?.abort()
      const abort = new AbortController()
      abortRef.current = abort
      try {
        if (checked) {
          await api.biometricEnroll(await createBiometricCredential(abort.signal))
        } else {
          // read the credential before dropping it, so we can ask the authenticator to forget it too
          const credentialInfo = await api.biometricGetCredentialInfo()
          await api.biometricUnenroll()
          if (credentialInfo) await signalCredentialRemoved(credentialInfo.credentialId)
          setShowRemoveHint(true)
        }
      } catch (err) {
        // resolves to null if the user cancelled the biometric prompt, or if we abandoned it
        setError(getErrorMessage(err) ?? undefined)
      } finally {
        setProcessing(false)
      }
    },
    [getErrorMessage]
  )

  // keep the setting visible while enrolled even if the authenticator became unavailable,
  // it's the only place where the enrollment can be cleared
  if (!available && !enrolled) return null

  return (
    <Setting
      iconLeft={UserCheckIcon}
      title={t("Biometric unlock")}
      subtitle={
        error ? (
          <span className="text-alert-warn">{error}</span>
        ) : showRemoveHint ? (
          t("You may also remove the passkey from your system keychain manually.")
        ) : available ? (
          t("Use Touch ID or Windows Hello to unlock your wallet")
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
