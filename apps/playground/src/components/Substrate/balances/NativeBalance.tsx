import { AccountInfo } from "@polkadot/types/interfaces"
import { useCallback, useEffect, useState } from "react"
import { Button } from "talisman-ui"

import { Section } from "../../shared/Section"
import { useApi } from "../shared/useApi"
import { useWallet } from "../shared/useWallet"

const useSystemPalletBalance = () => {
  const { api } = useApi()
  const { account } = useWallet()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error>()
  const [value, setValue] = useState<AccountInfo>()

  const refresh = useCallback(() => {
    if (!api || !account) return () => {}

    setError(undefined)
    setValue(undefined)
    setIsLoading(true)
    api.query.system
      .account<AccountInfo>(account.address)
      .then(setValue)
      .catch(setError)
      .finally(() => setIsLoading(false))
  }, [account, api])

  useEffect(() => {
    refresh()
  }, [refresh])

  return {
    accountData: value,
    error,
    isLoading,
    refresh,
  }
}

const DisplaySystemPalletBalance = () => {
  const { api } = useApi()
  const { account } = useWallet()
  const { isLoading, error, accountData, refresh } = useSystemPalletBalance()

  if (!api || !account) return null

  return (
    <div className="space-y-8">
      <h3>Pallet : system_account</h3>
      {isLoading && <div>Loading...</div>}
      {error && <div className="text-alert-error">{error.message}</div>}
      {accountData && <pre>{JSON.stringify(accountData.toHuman(), undefined, 2)}</pre>}
      <Button onClick={refresh}>Refresh</Button>
    </div>
  )
}

export const NativeBalance = () => {
  const { api } = useApi()
  const { account } = useWallet()

  if (!api || !account) return null

  return (
    <Section title="Balance">
      <div className="grid grid-cols-2 gap-8">
        <DisplaySystemPalletBalance />
      </div>
    </Section>
  )
}
