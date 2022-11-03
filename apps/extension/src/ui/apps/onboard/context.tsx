import { settingsStore } from "@core/domains/app/store.settings"
import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import { useIsOnboarded } from "@ui/hooks/useIsOnboarded"
import { ReactNode, useEffect } from "react"
import { useCallback, useState } from "react"

export type OnboardingWizardData = {
  password?: string
  passwordConfirm?: string
  mnemonic?: string
  allowTracking?: boolean
}

const DEFAULT_DATA: OnboardingWizardData = {}

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
    // toggle both error and analytics tracking based on user input
    // both these features have a subscription on the settings store, so nothing else is necessary
    // don't coerce, value is undefined until user makes a choice
    if (data.allowTracking !== undefined)
      settingsStore.set({
        useErrorTracking: data.allowTracking,
        useAnalyticsTracking: data.allowTracking,
      })
  }, [data.allowTracking])

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
