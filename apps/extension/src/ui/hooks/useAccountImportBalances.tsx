import { Address } from "@talismn/balances"
import { ChainId } from "@talismn/chaindata-provider"
import { KeypairCurve } from "@talismn/crypto"
import { encodeAnyAddress, validateHexString } from "@talismn/util"
import {
  AddressesAndEvmNetwork,
  AddressesByChain,
  isCurveCompatibleWithChain,
} from "extension-core"
import { useMemo } from "react"

import { useBalancesByParams } from "@ui/hooks/useBalancesByParams"
import { useChains, useEvmNetworks } from "@ui/state"

export type AccountImportDef = { address: string; curve: KeypairCurve; genesisHash?: string | null }

export const useAccountImportBalances = (accounts: AccountImportDef[]) => {
  const safeAccounts = useMemo(
    () =>
      accounts.map(({ address, curve, genesisHash }) => ({
        address: encodeAnyAddress(address),
        curve,
        genesisHash: genesisHash ? validateHexString(genesisHash) : null,
      })),
    [accounts],
  )

  const chains = useChains({ includeTestnets: false, activeOnly: true })
  const evmNetworks = useEvmNetworks({ includeTestnets: false, activeOnly: true })

  const balanceParams = useMemo(() => {
    const addressesByChain: AddressesByChain = chains.reduce(
      (prev, chain) => {
        const addresses = safeAccounts
          .filter(({ curve, genesisHash }) => isCurveCompatibleWithChain(chain, curve, genesisHash))
          .map(({ address }) => address)
        if (addresses.length) prev[chain.id] = addresses
        return prev
      },
      {} as Record<ChainId, Address[]>,
    )

    const addressesAndEvmNetworks: AddressesAndEvmNetwork = {
      addresses: safeAccounts.filter(({ curve }) => curve === "ethereum").map((acc) => acc.address),
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
