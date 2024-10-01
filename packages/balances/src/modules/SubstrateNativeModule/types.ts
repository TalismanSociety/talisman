import { TypeRegistry } from "@polkadot/types"
import { ExtDef } from "@polkadot/types/extrinsic/signedExtensions/types"
import { BalancesConfigTokenParams, ChainId, Token } from "@talismn/chaindata-provider"

import { NewTransferParamsType } from "../../BalanceModule"
import { NewBalanceType } from "../../types"

export { filterBaseLocks, getLockTitle } from "./util/balanceLockTypes"
export type { BalanceLockType } from "./util/balanceLockTypes"

export type ModuleType = "substrate-native"
export const moduleType: ModuleType = "substrate-native"

export type SubNativeToken = Extract<Token, { type: ModuleType; isCustom?: true }>
export type CustomSubNativeToken = Extract<Token, { type: ModuleType; isCustom: true }>

export const subNativeTokenId = (chainId: ChainId) =>
  `${chainId}-substrate-native`.toLowerCase().replace(/ /g, "-")

export type SubNativeChainMeta = {
  isTestnet: boolean
  useLegacyTransferableCalculation?: boolean
  symbol?: string
  decimals?: number
  existentialDeposit?: string
  nominationPoolsPalletId?: string
  crowdloanPalletId?: string
  hasSubtensorPallet?: boolean
  miniMetadata?: string
  metadataVersion?: number
}

export type SubNativeModuleConfig = {
  disable?: boolean
} & BalancesConfigTokenParams

export type SubNativeBalance = NewBalanceType<ModuleType, "complex", "substrate">

declare module "@talismn/balances/plugins" {
  export interface PluginBalanceTypes {
    "substrate-native": SubNativeBalance
  }
}

export type SubNativeTransferParams = NewTransferParamsType<{
  registry: TypeRegistry
  blockHash: string
  blockNumber: number
  nonce: number
  specVersion: number
  transactionVersion: number
  tip?: string
  userExtensions?: ExtDef
}>
