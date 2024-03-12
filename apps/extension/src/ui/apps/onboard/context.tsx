import { passwordStore } from "@extension/core"
import { settingsStore } from "@extension/core"
import { AccountAddressType } from "@extension/core"
import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import { useAppState } from "@ui/hooks/useAppState"
import { useIsOnboarded } from "@ui/hooks/useIsOnboarded"
import { ReactNode, useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

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
  const [stage, setStage] = useState<number>(0)
  const [passwordExists, setPasswordExists] = useState(false)
  const [, updateOnboarded] = useAppState("onboarded")
  const navigate = useNavigate()

  const updateData = useCallback((fields: Partial<OnboardingWizardData>) => {
    setData((prev) => ({ ...prev, ...fields }))
  }, [])

  const createPassword = useCallback(async (password: string, passwordConfirm: string) => {
    if (!password || !passwordConfirm) throw new Error("Password is not set")

    const result = await api.onboardCreatePassword(password, passwordConfirm)
    if (!result) throw new Error("Failed to set password")
    return result
  }, [])

  const reset = useCallback(() => {
    setData(DEFAULT_DATA)
  }, [])

  const setOnboarded = useCallback(() => {
    updateOnboarded("TRUE")
    navigate("/success")
  }, [navigate, updateOnboarded])

  const completeOnboarding = useCallback(
    () => (location.href = "dashboard.html#/portfolio?onboarded"),
    []
  )

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

  // handle case where user has navigated back, and a password already exists in the store
  useEffect(() => {
    passwordStore.get("secret").then((pw) => {
      setPasswordExists(!!pw)
    })
  }, [stage])

  useEffect(() => {
    return () => {
      setData(DEFAULT_DATA)
    }
  }, [])

  return {
    setOnboarded,
    completeOnboarding,
    createPassword,
    passwordExists,
    reset,
    isResettingWallet,
    data,
    updateData,
    stage,
    setStage,
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
    if (checked) return

    if (isOnboarded) window.location.href = "dashboard.html#/portfolio"

    setChecked(true)
  }, [checked, isOnboarded])

  return <AppOnboardProvider isResettingWallet={resetWallet}>{children}</AppOnboardProvider>
}

export const useOnboard = useAppOnboardContext

export default Provider
