import { classifyError } from "@common/analytics/errorCategory"
import { UserCheckIcon } from "@talismn/icons"
import { api } from "@ui/api"
import { Setting } from "@ui/components/Setting"
import { Toggle } from "@ui/components/Toggle"
import { type InlineError, useErrorShown } from "@ui/hooks/analytics/errorShown"
import { useEnableQuickUnlock } from "@ui/hooks/useEnableQuickUnlock"
import { useQuickUnlockErrorMessage } from "@ui/hooks/useQuickUnlockErrorMessage"
import { useIsQuickUnlockEnrolled } from "@ui/state/quickUnlock"
import { useFeatureFlag } from "@ui/state/remoteConfig"
import { isQuickUnlockAvailable, signalCredentialRemoved } from "@ui/util/webauthnPrf"
import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

export const QuickUnlockSetting = () => {
  const { t } = useTranslation()
  const isFeatureEnabled = useFeatureFlag("QUICK_UNLOCK")
  const enrolled = useIsQuickUnlockEnrolled()
  const [available, setAvailable] = useState<boolean | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<InlineError>()
  useErrorShown({ shown: error?.message, surface: "field", category: error?.category ?? "unknown" })
  const getQuickUnlockErrorMessage = useQuickUnlockErrorMessage()
  const enableQuickUnlock = useEnableQuickUnlock()

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
          const result = await enableQuickUnlock(abort.signal)
          if (result.status === "failed") setError(result)
        } else {
          // read the credential before dropping it, so we can ask the authenticator to forget it too
          const credentialInfo = await api.quickUnlockGetCredentialInfo()
          await api.quickUnlockUnenroll()
          if (credentialInfo) await signalCredentialRemoved(credentialInfo.credentialId)
        }
      } catch (err) {
        const message = getQuickUnlockErrorMessage(err)
        setError(message ? { message, category: classifyError(err) } : undefined)
      } finally {
        setProcessing(false)
      }
    },
    [enableQuickUnlock, getQuickUnlockErrorMessage]
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
          <span className="text-alert-warn">{error.message}</span>
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
