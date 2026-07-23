import { UserCheckIcon } from "@talismn/icons"
import { api } from "@ui/api"
import { Setting } from "@ui/components/Setting"
import { Toggle } from "@ui/components/Toggle"
import { createBiometricCredential, isBiometricAvailable } from "@ui/util/webauthnPrf"
import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

export const BiometricSetting = () => {
  const { t } = useTranslation()
  const [enrolled, setEnrolled] = useState(false)
  const [available, setAvailable] = useState<boolean | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string>()
  const [showRemoveHint, setShowRemoveHint] = useState(false)

  const abortRef = useRef<AbortController>(null)

  useEffect(() => {
    isBiometricAvailable().then(setAvailable)
    api.biometricIsEnrolled().then(setEnrolled)
    const unsubscribe = api.biometricIsEnrolledSubscribe(({ enrolled }) => setEnrolled(enrolled))
    return () => {
      unsubscribe()
      // abandon any ceremony still waiting on the user
      abortRef.current?.abort()
    }
  }, [])

  const handleToggle = useCallback(async (checked: boolean) => {
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
        await api.biometricUnenroll()
        setShowRemoveHint(true)
      }
    } catch (err) {
      // don't show an error if the user cancelled the biometric prompt, or if we abandoned it
      const { name } = err as DOMException
      if (name !== "NotAllowedError" && name !== "AbortError") setError((err as Error).message)
    } finally {
      // read back actual state from backend — subscription may be delayed
      const isEnrolled = await api.biometricIsEnrolled()
      setEnrolled(isEnrolled)
      setProcessing(false)
    }
  }, [])

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
