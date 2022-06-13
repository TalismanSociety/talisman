import { useCallback, useState } from "react"
import { api } from "@ui/api"

export type CreateAccountData = {
  name?: string
  password?: string
  passwordConfirm?: string
  mnemonic?: string
}

const useAppOnboard = () => {
  // save it here in case we history.back(), so we know it has been checked
  const [agreeToS, setAgreeToS] = useState(false)
  const [agreeAnalytics, setAgreeAnalytics] = useState(false)

  // data used for account creation
  const [data, setData] = useState<CreateAccountData>({})

  const updateData = useCallback((fields: Partial<CreateAccountData>) => {
    setData((prev) => ({ ...prev, ...fields }))
  }, [])

  const createAccount = useCallback(
    async (password: string, passwordConfirm: string) => {
      const { name, mnemonic } = data
      updateData({ password, passwordConfirm })
      await api.onboard(name as string, password, passwordConfirm, mnemonic)
    },
    [data, updateData]
  )

  const reset = useCallback(() => {
    setData({})
  }, [])

  return {
    createAccount,
    reset,
    agreeToS,
    setAgreeToS,
    agreeAnalytics,
    setAgreeAnalytics,
    data,
    updateData,
  }
}

export default useAppOnboard
