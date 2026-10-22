import { api } from "@ui/api"
import { type FlowStep, flows, useFlow } from "@ui/hooks/analytics/flows"
import { useQuickUnlockErrorMessage } from "@ui/hooks/useQuickUnlockErrorMessage"
import {
  createQuickUnlockCredential,
  PrfEvaluationError,
  type QuickUnlockCredential,
  signalCredentialRemoved,
} from "@ui/util/webauthnPrf"
import { useCallback, useState } from "react"
import { useTranslation } from "react-i18next"

export type EnableQuickUnlockResult =
  | { status: "enabled" }
  | { status: "cancelled" }
  | { status: "failed"; message: string }

export const useEnableQuickUnlock = () => {
  const { t } = useTranslation()
  const getQuickUnlockErrorMessage = useQuickUnlockErrorMessage()
  const [isSettingUp, setIsSettingUp] = useState(false)
  const [setupStep, setSetupStep] = useState<FlowStep<typeof flows.quick_unlock_setup>>("passkey")
  useFlow(flows.quick_unlock_setup, { active: isSettingUp, step: setupStep })

  return useCallback(
    async (signal: AbortSignal): Promise<EnableQuickUnlockResult> => {
      const mentionLeftoverPasskey = (reason: string) =>
        t(
          "{{reason}} A passkey may have been created, you can remove it from your system settings.",
          { reason }
        )

      setIsSettingUp(true)
      setSetupStep("passkey")

      let credential: QuickUnlockCredential
      try {
        credential = await createQuickUnlockCredential(signal)
      } catch (err) {
        flows.quick_unlock_setup.failed(err)
        // null when the user cancelled the prompt, or when we abandoned it
        const message = getQuickUnlockErrorMessage(err)
        if (!message) return { status: "cancelled" }

        // a passkey was created before we found out the authenticator can't evaluate a PRF, and
        // removing it again is only best-effort
        return {
          status: "failed",
          message: err instanceof PrfEvaluationError ? mentionLeftoverPasskey(message) : message,
        }
      }

      setSetupStep("enrol")
      flows.quick_unlock_setup.step("enrol")
      flows.quick_unlock_setup.submitted()
      try {
        await api.quickUnlockEnroll(credential)
      } catch (err) {
        flows.quick_unlock_setup.failed(err)
        // the passkey exists but we can't use it, don't leave it behind. removal is best-effort
        // though, so tell the user where to find it if the authenticator keeps it
        await signalCredentialRemoved(credential.credentialId)
        return {
          status: "failed",
          message: mentionLeftoverPasskey(
            getQuickUnlockErrorMessage(err) ?? t("Quick unlock could not be enabled.")
          ),
        }
      }

      flows.quick_unlock_setup.completed()
      setIsSettingUp(false)
      return { status: "enabled" }
    },
    [getQuickUnlockErrorMessage, t]
  )
}
