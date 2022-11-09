import { Chain } from "@core/domains/chains/types"
import { EvmNetwork } from "@core/domains/ethereum/types"

export const getNetworkCategory = ({
  chain,
  evmNetwork,
  relay,
}: {
  chain?: Chain | null
  evmNetwork?: EvmNetwork | null
  relay?: Chain
}) => {
  if (evmNetwork) return evmNetwork.isTestnet ? "EVM Testnet" : "EVM Blockchain"

  if (chain) {
    if (chain.isTestnet) return "Testnet"
    return chain.paraId
      ? (relay?.chainName ? `${relay?.chainName} ` : "") + "Parachain"
      : (chain.parathreads || []).length > 0
      ? "Relay Chain"
      : "Blockchain"
  }

  return null
}
