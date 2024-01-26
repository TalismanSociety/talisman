import type { KeypairType } from "@polkadot/util-crypto/types"
import type { Chain } from "@talismn/chaindata-provider"

export const isAccountCompatibleWithChain = (
  chain: Chain,
  type: KeypairType,
  genesisHash: `0x${string}` | null | undefined
) => {
  if (genesisHash && genesisHash !== chain.genesisHash) return false
  return type === "ethereum" ? chain.account === "secp256k1" : chain.account !== "secp256k1"
}
