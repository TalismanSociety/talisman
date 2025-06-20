import { TypeRegistry } from "@polkadot/types"
import { ExtDef } from "@polkadot/types/extrinsic/signedExtensions/types"
import { BalancesConfigTokenParams } from "@talismn/chaindata-provider"

import { ChainMeta, NewTransferParamsType } from "../../BalanceModule"
import { NewBalanceType } from "../../types"

export { filterBaseLocks, getLockTitle } from "./util/balanceLockTypes"
export type { BalanceLockType } from "./util/balanceLockTypes"

export type ModuleType = "substrate-native"
export const moduleType: ModuleType = "substrate-native"

export type SubNativeChainMeta = ChainMeta<{
  useLegacyTransferableCalculation?: boolean
  existentialDeposit?: string
  nominationPoolsPalletId?: string
  crowdloanPalletId?: string // TODO yeet
  hasSubtensorPallet?: boolean
} | null>

export type SubNativeModuleConfig = {
  disable?: boolean
} & BalancesConfigTokenParams

export type SubNativeBalance = NewBalanceType<ModuleType, "complex">

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
