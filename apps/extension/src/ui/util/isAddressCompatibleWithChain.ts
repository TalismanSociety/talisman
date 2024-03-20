import { Chain } from "@talismn/chaindata-provider"
import { isEthereumAddress } from "@talismn/util"

export const isAddressCompatibleWithChain = (chain: Chain, address: string) => {
  return isEthereumAddress(address) ? chain.account === "secp256k1" : chain.account !== "secp256k1"
}
