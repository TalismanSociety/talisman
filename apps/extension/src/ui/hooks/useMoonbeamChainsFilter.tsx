import { useMemo } from "react"
import { isEthereumAddress } from "@polkadot/util-crypto/ethereum"
import type { Chain } from "@core/types"

const moonbeamFilter = (chain: Chain) => ["moonbeam", "moonriver"].includes(chain.id)
const polkadotFilter = (chain: Chain) => !["moonbeam", "moonriver"].includes(chain.id)

const useMoonbeamChainsFilter = (chains: Chain[], address: string) => {
  return useMemo(
    () => chains.filter(isEthereumAddress(address) ? moonbeamFilter : polkadotFilter),
    [chains, address]
  )
}

export default useMoonbeamChainsFilter
