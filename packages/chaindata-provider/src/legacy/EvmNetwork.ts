import { TokenId } from "../chaindata"
import { LegacyChainId } from "./Chain"

/** @deprecated */
export type LegacyEvmNetworkId = string

/** @deprecated */
export type LegacyEvmNetwork = {
  id: LegacyEvmNetworkId
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
  substrateChain: { id: LegacyChainId } | null
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
export type LegacyCustomEvmNetwork = LegacyEvmNetwork & {
  isCustom: true
  explorerUrls: string[]
  iconUrls: string[]
}
type EthereumRpc = {
  url: string // The url of this RPC
}
type BalancesConfigLegacy = { moduleType: string; moduleConfig: unknown }
type BalancesMetadataLegacy = { moduleType: string; metadata: unknown }
