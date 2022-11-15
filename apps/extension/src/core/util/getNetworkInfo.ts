import { Chain } from "@core/domains/chains/types"
import { EvmNetwork } from "@core/domains/ethereum/types"

export const getNetworkInfo = ({
  chain,
  evmNetwork,
  relay,
}: {
  chain?: Chain | null
  evmNetwork?: EvmNetwork
  relay?: Chain
}) => {
  if (evmNetwork)
    return { label: evmNetwork.name, type: evmNetwork.isTestnet ? "EVM Testnet" : "EVM blockchain" }

  if (chain) {
    if (chain.isTestnet) return { label: chain.name, type: "Testnet" }
    return {
      label: chain.name,
      type: chain.paraId
        ? relay?.chainName
          ? `${relay?.chainName} Parachain`
          : "Parachain"
        : (chain.parathreads || []).length > 0
        ? "Relay chain"
        : "Blockchain",
    }
  }

  return { label: "", type: "" }
}
