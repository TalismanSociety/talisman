import { UserCheckIcon } from "@talismn/icons"
import { api } from "@ui/api"
import { Setting } from "@ui/components/Setting"
import { Toggle } from "@ui/components/Toggle"
import { createBiometricCredential, isBiometricAvailable } from "@ui/util/webauthnPrf"
import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

export const BiometricSetting = () => {
  const { t } = useTranslation()
  const [enrolled, setEnrolled] = useState(false)
  const [available, setAvailable] = useState<boolean | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string>()
  const [showRemoveHint, setShowRemoveHint] = useState(false)

  useEffect(() => {
    isBiometricAvailable().then(setAvailable)
    api.biometricIsEnrolled().then(setEnrolled)
    const unsubscribe = api.biometricIsEnrolledSubscribe(({ enrolled }) => setEnrolled(enrolled))
    return () => unsubscribe()
  }, [])

  const handleToggle = useCallback(async (checked: boolean) => {
    setProcessing(true)
    setError(undefined)
    setShowRemoveHint(false)
    try {
      if (checked) {
        await api.biometricEnroll(await createBiometricCredential())
      } else {
        await api.biometricUnenroll()
        setShowRemoveHint(true)
      }
    } catch (err) {
      const message = (err as Error).message
      // don't show error if user canceled the biometric prompt
      if ((err as DOMException).name !== "NotAllowedError") {
        setError(message)
      }
    } finally {
      // read back actual state from backend — subscription may be delayed
      const isEnrolled = await api.biometricIsEnrolled()
      setEnrolled(isEnrolled)
      setProcessing(false)
    }
  }, [])

  if (available === null || !available) return null

  return (
    <Setting
      iconLeft={UserCheckIcon}
      title={t("Biometric unlock")}
      subtitle={
        error ? (
          <span className="text-alert-warn">{error}</span>
        ) : showRemoveHint ? (
          t("You may also remove the passkey from your system keychain manually.")
        ) : (
          t("Use Touch ID or Windows Hello to unlock your wallet")
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
