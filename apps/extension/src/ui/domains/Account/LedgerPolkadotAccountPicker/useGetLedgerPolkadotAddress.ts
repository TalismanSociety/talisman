import { normalizeAddress } from "@talismn/crypto"
import { GenericeResponseAddress, SubstrateAppParams } from "@zondax/ledger-substrate/dist/common"
import { LedgerPolkadotCurve } from "extension-core"
import { useCallback, useRef } from "react"

import { getPolkadotLedgerDerivationPath } from "@ui/hooks/ledger/common"
import { useLedgerPolkadot } from "@ui/hooks/ledger/useLedgerPolkadot"

export const useGetLedgerPolkadotAddress = (
  curve: LedgerPolkadotCurve,
  legacyApp?: SubstrateAppParams | null,
) => {
  const { getAddressEcdsa, getAddressEd25519 } = useLedgerPolkadot({ legacyApp })

  // derivation path => address cache, usefull when going back to previous page
  const refAddressCache = useRef<Record<string, Promise<GenericeResponseAddress>>>({})

  const getAddress = useCallback(
    async (accountIndex: number, addressOffset: number) => {
      const derivationPath = getPolkadotLedgerDerivationPath({
        accountIndex,
        addressOffset,
        legacyApp,
      })
      const prefix = legacyApp?.ss58_addr_type ?? 42
      const cacheKey = `${curve}::${prefix}::${derivationPath}`

      if (!refAddressCache.current[cacheKey]) {
        switch (curve) {
          case "ethereum":
            refAddressCache.current[cacheKey] = getAddressEcdsa(derivationPath)
            break
          case "ed25519":
            refAddressCache.current[cacheKey] = getAddressEd25519(derivationPath, prefix)
            break
        }
      }

      const result = await refAddressCache.current[cacheKey]

      switch (curve) {
        case "ethereum":
          return normalizeAddress(`0x${result.address}`)
        case "ed25519":
          return result.address
      }
    },
    [curve, getAddressEcdsa, getAddressEd25519, legacyApp],
  )

  return { getAddress }
}
