import { AccountAddressType } from "@core/domains/accounts/types"
import { settingsStore } from "@core/domains/app/store.settings"
import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import { useIsOnboarded } from "@ui/hooks/useIsOnboarded"
import { ReactNode, useEffect } from "react"
import { useCallback, useState } from "react"

export type ImportMethodType = "mnemonic" | "private-key" | "ledger" | "qr" | "json"

export type OnboardingWizardData = {
  password?: string
  passwordConfirm?: string
  mnemonic?: string
  allowTracking?: boolean
  importAccountType?: AccountAddressType
  importMethodType?: ImportMethodType
}

const DEFAULT_DATA: OnboardingWizardData = {}

const useAppOnboardProvider = ({ isResettingWallet = false }: { isResettingWallet?: boolean }) => {
  // data used for account creation
  const [data, setData] = useState<OnboardingWizardData>(DEFAULT_DATA)

  const updateData = useCallback((fields: Partial<OnboardingWizardData>) => {
    setData((prev) => ({ ...prev, ...fields }))
  }, [])

  const onboard = useCallback(async () => {
    const { mnemonic, password, passwordConfirm, importAccountType, importMethodType } = data

    if (!password || !passwordConfirm) throw new Error("Password is not set")

    if ((await api.onboard(password, passwordConfirm, mnemonic)) !== "TRUE")
      throw new Error("Failed to onboard")

    if (importMethodType === "json") location.href = "dashboard.html#/accounts/add/json"
    else if (importMethodType === "ledger")
      location.href = `dashboard.html#/accounts/add/ledger?type=${importAccountType}`
    else if (importMethodType === "qr")
      location.href = `dashboard.html#/accounts/add/qr?type=${importAccountType}`
    else if (importMethodType === "private-key")
      location.href = `dashboard.html#/accounts/add/secret?type=${importAccountType}`
    else if (isResettingWallet) location.href = "dashboard.html#/portfolio"
    else location.href = "dashboard.html#/portfolio?onboarded"
  }, [data, isResettingWallet])

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
    isResettingWallet,
    data,
    updateData,
  }
}

const [AppOnboardProvider, useAppOnboardContext] = provideContext(useAppOnboardProvider)

const Provider = ({
  children,
  resetWallet = false,
}: {
  children?: ReactNode
  resetWallet?: boolean
}) => {
  const isOnboarded = useIsOnboarded()
  const [checked, setChecked] = useState(false)
  // if user is already onboarded when he opens onboarding page, redirect to dashboard page
  // only check once, the last page of the workflow will take care of the redirect
  useEffect(() => {
    if (checked || isOnboarded === "UNKNOWN") return

    if (isOnboarded === "TRUE") window.location.href = "dashboard.html#/portfolio"

    setChecked(true)
  }, [checked, isOnboarded])

  // Wait until we know if user has already onboarded
  if (isOnboarded === "UNKNOWN") return null

  return <AppOnboardProvider isResettingWallet={resetWallet}>{children}</AppOnboardProvider>
}

export const useOnboard = useAppOnboardContext

export default Provider
