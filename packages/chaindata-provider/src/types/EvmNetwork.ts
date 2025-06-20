import { TokenId } from "../chaindata"
import { BalancesConfigLegacy, BalancesMetadataLegacy, ChainId } from "./Chain"

/** @deprecated */
export type EvmNetworkList = Record<EvmNetworkId, EvmNetwork>
/** @deprecated */
export type SimpleEvmNetworkList = Record<EvmNetworkId, SimpleEvmNetwork>

/** @deprecated */
export type EvmNetworkId = string

/** @deprecated */
export type EvmNetwork = {
  id: EvmNetworkId
  isTestnet: boolean
  isDefault: boolean
  forceScan: boolean
  /** @deprecated */
  sortIndex: number | null
  name: string | null
  themeColor: string | null
  logo: string | null
  // TODO: Create ethereum tokens store (and reference here by id).
  //       Or extend substrate tokens store to support both substrate and ethereum tokens.
  nativeToken: { id: TokenId } | null
  /** @deprecated tokens already reference their network */
  tokens: Array<{ id: TokenId }> | null
  explorerUrl: string | null
  rpcs: Array<EthereumRpc> | null
  substrateChain: { id: ChainId } | null
  /**
   * indicates whether gasEstimates must be used as-is for txs to be valid
   *
   * PolkadotVM: https://contracts.polkadot.io/differences_to_eth
   * Acala: https://evmdocs.acala.network/network/gas-parameters
   */
  preserveGasEstimate?: boolean
  feeType?: "legacy" | "eip-1559"
  l2FeeType?:
    | {
        type: "op-stack"
      }
    | {
        type: "scroll"
        l1GasPriceOracle: `0x${string}`
      }

  balancesConfig: Array<BalancesConfigLegacy>
  // TODO: Delete (has its own store now)
  /** @deprecated has its own store now */
  balancesMetadata: Array<BalancesMetadataLegacy>
  erc20aggregator?: `0x${string}`
}

/** @deprecated */
export type CustomEvmNetwork = EvmNetwork & {
  isCustom: true
  explorerUrls: string[]
  iconUrls: string[]
}

/** @deprecated */
export type SimpleEvmNetwork = Omit<
  EvmNetwork | CustomEvmNetwork,
  "balancesConfig" | "balancesMetadata"
>

/** @deprecated */
export type EthereumRpc = {
  url: string // The url of this ethereum RPC
}
