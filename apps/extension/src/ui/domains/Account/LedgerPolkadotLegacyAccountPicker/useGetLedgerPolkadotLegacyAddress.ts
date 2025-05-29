import { useCallback, useRef } from "react"

import { useLedgerSubstrateLegacy } from "@ui/hooks/ledger/useLedgerSubstrateLegacy"

export const useGetLedgerPolkadotLegacyAddress = (genesisHash: `0x${string}`) => {
  const { getAddress: getAccountAddress } = useLedgerSubstrateLegacy(genesisHash)

  // derivation path => address cache, usefull when going back to previous page
  const refAddressCache = useRef<Record<string, Promise<{ address: string }>>>({})

  const getAddress = useCallback(
    async (accountIndex: number, addressIndex: number) => {
      const cacheKey = `${genesisHash}::${accountIndex}::${addressIndex}`

      if (!refAddressCache.current[cacheKey]) {
        refAddressCache.current[cacheKey] = getAccountAddress(accountIndex, addressIndex)
      }

      const { address } = await refAddressCache.current[cacheKey]

      return address
    },
    [genesisHash, getAccountAddress],
  )

  return { getAddress }
}
