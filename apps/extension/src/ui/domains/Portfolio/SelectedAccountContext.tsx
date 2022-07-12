import { AccountJsonAny } from "@core/domains/accounts/types"
import { provideContext } from "@talisman/util/provideContext"
import useAccounts from "@ui/hooks/useAccounts"
import { useSettings } from "@ui/hooks/useSettings"
import { useCallback, useMemo, useState } from "react"

const useSelectedAccountProvider = () => {
  const accounts = useAccounts()
  const { selectedAccount, update } = useSettings()

  const account = useMemo(
    () => accounts.find((account) => account.address === selectedAccount),
    [accounts, selectedAccount]
  )

  const select = useCallback(
    (accountOrAddress: AccountJsonAny | string | undefined) => {
      const address =
        typeof accountOrAddress === "string" ? accountOrAddress : accountOrAddress?.address
      if (address === undefined || accounts.some((acc) => acc.address === address))
        update({ selectedAccount: address })
    },
    [accounts, update]
  )

  return { select, accounts, account }
}

export const [SelectedAccountProvider, useSelectedAccount] = provideContext(
  useSelectedAccountProvider
)
