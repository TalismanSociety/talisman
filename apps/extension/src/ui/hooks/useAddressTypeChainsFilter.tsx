import type { Chain } from "@core/domains/chains/types"
import { isEthereumAddress } from "@polkadot/util-crypto/ethereum"
import { useMemo } from "react"

const ethereumFilter = (chain: Chain) =>
  chain.account === "secp256k1" || chain.evmNetworks.length > 0
const polkadotFilter = (chain: Chain) => !ethereumFilter(chain)

const useAddressTypeChainsFilter = (chains: Chain[], address: string) => {
  return useMemo(
    () => chains.filter(isEthereumAddress(address) ? ethereumFilter : polkadotFilter),
    [chains, address]
  )
}

export default useAddressTypeChainsFilter
