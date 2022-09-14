import { Chain } from "@core/domains/chains/types"
import { EvmNetwork } from "@core/domains/ethereum/types"

export const getNetworkInfo = ({
  chain,
  evmNetwork,
}: {
  chain?: Chain
  evmNetwork?: EvmNetwork
}) => {
  if (evmNetwork)
    return { label: evmNetwork.name, type: evmNetwork.isTestnet ? "EVM Testnet" : "EVM blockchain" }

  if (chain) {
    if (chain.isTestnet) return { label: chain.name, type: "Testnet" }
    return {
      label: chain.name,
      type: chain.paraId
        ? "Parachain"
        : (chain.parathreads || []).length > 0
        ? "Relay chain"
        : "Blockchain",
    }
  }

  return { label: "", type: "" }
}
