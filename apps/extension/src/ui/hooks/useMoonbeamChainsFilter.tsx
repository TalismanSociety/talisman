import { useMemo } from "react"
import { isEthereumAddress } from "@polkadot/util-crypto/ethereum"
import type { Chain } from "@core/types"

const moonbeamFilter = (chain: Chain) =>
  chain.account === "secp256k1" || chain.evmNetworks.length > 0
const polkadotFilter = (chain: Chain) =>
  !(chain.account === "secp256k1" || chain.evmNetworks.length > 0)

const useMoonbeamChainsFilter = (chains: Chain[], address: string) => {
  return useMemo(
    () => chains.filter(isEthereumAddress(address) ? moonbeamFilter : polkadotFilter),
    [chains, address]
  )
}

export default useMoonbeamChainsFilter
