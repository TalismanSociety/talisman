import { Account } from "extension-core"
import { useMemo } from "react"

import { BalanceByParamsProps, useBalancesByParams } from "@ui/hooks/useBalancesByParams"
import { useNetworksMapById, useTokens } from "@ui/state"

export const useAccountImportBalances = (accounts: Account[]) => {
  const networks = useNetworksMapById({ includeTestnets: false, activeOnly: true })
  const tokens = useTokens({ includeTestnets: false, activeOnly: true })

  const balanceParams = useMemo((): BalanceByParamsProps => {
    const tokenIds = tokens.filter((t) => networks[t.networkId]).map((t) => t.id)
    const addresses = accounts.map(({ address }) => address)

    return {
      addressesAndTokens: {
        addresses,
        tokenIds,
      },
    }
  }, [tokens, accounts, networks])

  return useBalancesByParams(balanceParams)
}
