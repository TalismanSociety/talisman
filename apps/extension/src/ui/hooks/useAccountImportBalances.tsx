import { Address } from "@talismn/balances"
import { ChainId, isDotNetwork, isEthNetwork, Network } from "@talismn/chaindata-provider"
import { Account, isAccountPlatformEthereum } from "extension-core"
import { isAccountCompatibleWithNetwork } from "extension-core/src/domains/accounts/helpers"
import { useMemo } from "react"

import { BalanceByParamsProps, useBalancesByParams } from "@ui/hooks/useBalancesByParams"
import { useNetworks } from "@ui/state"

export const useAccountImportBalances = (accounts: Account[]) => {
  const networks = useNetworks({ includeTestnets: false, activeOnly: true })
  // const chains = useChains({ includeTestnets: false, activeOnly: true })
  // const evmNetworks = useEvmNetworks({ includeTestnets: false, activeOnly: true })

  const balanceParams = useMemo((): BalanceByParamsProps => {
    const addressesByChain: BalanceByParamsProps["addressesByChain"] = networks
      .filter(isDotNetwork)
      .reduce(
        (prev, network) => {
          const addresses = accounts
            .filter((acc) => isAccountCompatibleWithNetwork(network as unknown as Network, acc))
            .map(({ address }) => address)
          if (addresses.length) prev[network.id] = addresses
          return prev
        },
        {} as Record<ChainId, Address[]>,
      )

    const evmNetworks = networks.filter(isEthNetwork)

    const addresses = accounts.filter(isAccountPlatformEthereum).map(({ address }) => address)

    const addressesAndEvmNetworks =
      evmNetworks.length && addresses.length ? { addresses, evmNetworks } : undefined

    return {
      addressesByChain: Object.keys(addressesByChain).length ? addressesByChain : undefined,
      addressesAndEvmNetworks,
    }
  }, [networks, accounts])

  return useBalancesByParams(balanceParams)
}
