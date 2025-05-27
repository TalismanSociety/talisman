import { Address } from "@talismn/balances"
import { ChainId } from "@talismn/chaindata-provider"
import { Account, isAccountCompatibleWithChain, isAccountPlatformEthereum } from "extension-core"
import { useMemo } from "react"

import { BalanceByParamsProps, useBalancesByParams } from "@ui/hooks/useBalancesByParams"
import { useChains, useEvmNetworks } from "@ui/state"

export const useAccountImportBalances = (accounts: Account[]) => {
  const chains = useChains({ includeTestnets: false, activeOnly: true })
  const evmNetworks = useEvmNetworks({ includeTestnets: false, activeOnly: true })

  const balanceParams = useMemo((): BalanceByParamsProps => {
    const addressesByChain: BalanceByParamsProps["addressesByChain"] = chains.reduce(
      (prev, network) => {
        const addresses = accounts
          .filter((acc) => isAccountCompatibleWithChain(network, acc))
          .map(({ address }) => address)
        if (addresses.length) prev[network.id] = addresses
        return prev
      },
      {} as Record<ChainId, Address[]>,
    )

    const addresses = accounts.filter(isAccountPlatformEthereum).map(({ address }) => address)

    const addressesAndEvmNetworks =
      evmNetworks.length && addresses.length ? { addresses, evmNetworks } : undefined

    return {
      addressesByChain: Object.keys(addressesByChain).length ? addressesByChain : undefined,
      addressesAndEvmNetworks,
    }
  }, [chains, evmNetworks, accounts])

  return useBalancesByParams(balanceParams)
}
