import type { Enum } from "@polkadot-api/substrate-bindings"
import type { TaoDataApi } from "extension-core"

type TaoDataClient = TaoDataApi<unknown>
type TaoDataResponseData<T> = T extends (...args: infer _Args) => Promise<infer R>
  ? R extends { data: infer D }
    ? D
    : never
  : never

export type SubnetPool = TaoDataResponseData<TaoDataClient["pools"]["listPools"]>[number]

export type SubnetSummary = TaoDataResponseData<TaoDataClient["subnets"]["listSubnets"]>[number]

export type SubnetData = Partial<SubnetPool> &
  Partial<SubnetSummary> & {
    name?: string
    symbol?: string
  }

export type ValidatorYield = TaoDataResponseData<
  TaoDataClient["subnets"]["listSubnetValidators"]
>[number]

export type RootClaimTypeEnum = Enum<{
  Swap: undefined
  Keep: undefined
  KeepSubnets: { subnets: number[] }
}>

export type RootClaimType = RootClaimTypeEnum["type"]
