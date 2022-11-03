import { Chain } from "@core/domains/chains/types"
import { EvmNetwork } from "@core/domains/ethereum/types"

export const getNetworkCategory = ({
  chain,
  evmNetwork,
}: {
  chain?: Chain | null
  evmNetwork?: EvmNetwork | null
}) => {
  if (evmNetwork) return evmNetwork.isTestnet ? "EVM Testnet" : "EVM Blockchain"

  if (chain) {
    if (chain.isTestnet) return "Testnet"
    return chain.paraId
      ? "Parachain"
      : (chain.parathreads || []).length > 0
      ? "Relay Chain"
      : "Blockchain"
  }

  return null
}
