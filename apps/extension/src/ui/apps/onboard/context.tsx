import { DEBUG } from "@core/constants"
import { settingsStore } from "@core/domains/app"
import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import { useIsOnboarded } from "@ui/hooks/useIsOnboarded"
import { ReactNode, useEffect } from "react"
import { useCallback, useState } from "react"

export type OnboardingWizardData = {
  password?: string
  passwordConfirm?: string
  mnemonic?: string
  agreeToS?: boolean
  allowLogging?: boolean
}

const DEFAULT_DATA: OnboardingWizardData = DEBUG
  ? {
      mnemonic: "test test test test test test test test test test test junk",
      password: "Password0",
      passwordConfirm: "Password0",
      agreeToS: true,
    }
  : {}

const useAppOnboardProvider = () => {
  // data used for account creation
  const [data, setData] = useState<OnboardingWizardData>(DEFAULT_DATA)

  const updateData = useCallback((fields: Partial<OnboardingWizardData>) => {
    setData((prev) => ({ ...prev, ...fields }))
  }, [])

  const onboard = useCallback(async () => {
    const { mnemonic, password, passwordConfirm } = data

    if (!password || !passwordConfirm) throw new Error("Password is not set")

    if ((await api.onboard(password, passwordConfirm, mnemonic)) !== "TRUE")
      throw new Error("Failed to onboard")
  }, [data])

  const reset = useCallback(() => {
    setData(DEFAULT_DATA)
  }, [])

  // update
  useEffect(() => {
    if (data.allowLogging !== undefined)
      settingsStore.set({
        useErrorTracking: data.allowLogging,
        useAnalyticsTracking: data.allowLogging,
      })
  }, [data.allowLogging])

  return {
    onboard,
    reset,
    data,
    updateData,
  }
}

const [AppOnboardProvider, useAppOnboardContext] = provideContext(useAppOnboardProvider)

const Provider = ({ children }: { children?: ReactNode }) => {
  const isOnboarded = useIsOnboarded()

  useEffect(() => {
    if (isOnboarded === "TRUE") window.location.href = "dashboard.html#/portfolio?onboarded"
  })

  // Wait until we know if user has already onboarded
  if (isOnboarded === "UNKNOWN") return null

  return <AppOnboardProvider>{children}</AppOnboardProvider>
}

export const useOnboard = useAppOnboardContext

export default Provider
