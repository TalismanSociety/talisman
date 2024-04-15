import { AddressesByChain, isAccountCompatibleWithChain } from "@extension/core"
import { AddressesAndEvmNetwork } from "@extension/core"
import type { KeypairType } from "@polkadot/util-crypto/types"
import { Address } from "@talismn/balances"
import { ChainId } from "@talismn/chaindata-provider"
import { encodeAnyAddress, validateHexString } from "@talismn/util"
import { useBalancesByParams } from "@ui/hooks/useBalancesByParams"
import useChains from "@ui/hooks/useChains"
import { useEvmNetworks } from "@ui/hooks/useEvmNetworks"
import { useMemo } from "react"

export type AccountImportDef = { address: string; type: KeypairType; genesisHash?: string | null }

export const useAccountImportBalances = (accounts: AccountImportDef[]) => {
  const safeAccounts = useMemo(
    () =>
      accounts.map(({ address, type, genesisHash }) => ({
        address: encodeAnyAddress(address),
        type,
        genesisHash: genesisHash ? validateHexString(genesisHash) : null,
      })),
    [accounts]
  )

  const { chains } = useChains({ includeTestnets: false, activeOnly: true })
  const { evmNetworks } = useEvmNetworks({ includeTestnets: false, activeOnly: true })

  const balanceParams = useMemo(() => {
    const addressesByChain: AddressesByChain = chains.reduce((prev, chain) => {
      const addresses = safeAccounts
        .filter(({ type, genesisHash }) => isAccountCompatibleWithChain(chain, type, genesisHash))
        .map(({ address }) => address)
      if (addresses.length) prev[chain.id] = addresses
      return prev
    }, {} as Record<ChainId, Address[]>)

    const addressesAndEvmNetworks: AddressesAndEvmNetwork = {
      addresses: safeAccounts.filter(({ type }) => type === "ethereum").map((acc) => acc.address),
      evmNetworks: evmNetworks.map(({ id, nativeToken }) => ({
        id,
        nativeToken: { id: nativeToken?.id as string },
      })),
    }

    return {
      addressesByChain: Object.keys(addressesByChain).length ? addressesByChain : undefined,
      addressesAndEvmNetworks:
        addressesAndEvmNetworks.addresses.length && addressesAndEvmNetworks.evmNetworks.length
          ? addressesAndEvmNetworks
          : undefined,
    }
  }, [chains, evmNetworks, safeAccounts])

  return useBalancesByParams(balanceParams)
}
