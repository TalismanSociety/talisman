import { UserCheckIcon } from "@talismn/icons"
import { api } from "@ui/api"
import { Setting } from "@ui/components/Setting"
import { Toggle } from "@ui/components/Toggle"
import { type FlowStep, flows, useFlow } from "@ui/hooks/analytics/flows"
import { useQuickUnlockErrorMessage } from "@ui/hooks/useQuickUnlockErrorMessage"
import { useIsQuickUnlockEnrolled } from "@ui/state/quickUnlock"
import { useFeatureFlag } from "@ui/state/remoteConfig"
import {
  createQuickUnlockCredential,
  isQuickUnlockAvailable,
  PrfEvaluationError,
  signalCredentialRemoved,
} from "@ui/util/webauthnPrf"
import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

export const QuickUnlockSetting = () => {
  const { t } = useTranslation()
  const isFeatureEnabled = useFeatureFlag("QUICK_UNLOCK")
  const enrolled = useIsQuickUnlockEnrolled()
  const [available, setAvailable] = useState<boolean | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string>()
  const getQuickUnlockErrorMessage = useQuickUnlockErrorMessage()
  const [isSettingUp, setIsSettingUp] = useState(false)
  const [setupStep, setSetupStep] = useState<FlowStep<typeof flows.quick_unlock_setup>>("passkey")
  useFlow(flows.quick_unlock_setup, { active: isSettingUp, step: setupStep })

  const abortRef = useRef<AbortController>(null)

  useEffect(() => {
    isQuickUnlockAvailable().then(setAvailable)
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
          setIsSettingUp(true)
          setSetupStep("passkey")
          const credential = await createQuickUnlockCredential(abort.signal)
          setSetupStep("enrol")
          // the state reaches the flow on the next render, after submitted
          flows.quick_unlock_setup.step("enrol")
          flows.quick_unlock_setup.submitted()
          try {
            await api.quickUnlockEnroll(credential)
            flows.quick_unlock_setup.completed()
            setIsSettingUp(false)
          } catch (err) {
            flows.quick_unlock_setup.failed(err)
            // the passkey exists but we can't use it, don't leave it behind. removal is best-effort
            // though, so tell the user where to find it if the authenticator keeps it
            await signalCredentialRemoved(credential.credentialId)
            setError(
              t(
                "{{reason}} A passkey may have been created, you can remove it from your system settings.",
                {
                  reason:
                    getQuickUnlockErrorMessage(err) ?? t("Quick unlock could not be enabled."),
                }
              )
            )
            return
          }
        } else {
          // read the credential before dropping it, so we can ask the authenticator to forget it too
          const credentialInfo = await api.quickUnlockGetCredentialInfo()
          await api.quickUnlockUnenroll()
          if (credentialInfo) await signalCredentialRemoved(credentialInfo.credentialId)
        }
      } catch (err) {
        if (checked) flows.quick_unlock_setup.failed(err)
        // resolves to null if the user cancelled the quick unlock prompt, or if we abandoned it
        const message = getQuickUnlockErrorMessage(err)

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
    [getQuickUnlockErrorMessage, t]
  )

  // keep the setting visible while enrolled even if the authenticator became unavailable
  // or the feature flag was turned off, it's the only place where the enrollment can be cleared
  if ((!available || !isFeatureEnabled) && !enrolled) return null

  return (
    <Setting
      iconLeft={UserCheckIcon}
      title={t("Quick unlock")}
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
