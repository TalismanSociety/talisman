import type { TaoDataApi } from "@core/domains/bittensor/exports"

type TaoDataClient = TaoDataApi<unknown>
type TaoDataResponseData<T> = T extends (...args: infer _Args) => Promise<infer R>
  ? R extends { data: infer D }
    ? D
    : never
  : never

export type SubnetPool = TaoDataResponseData<TaoDataClient["pools"]["listPools"]>[number]

export type SubnetSummary = {
  netuid: number
  /** Per-block TAO-side emission in rao (string). Consumers multiply ×2 for total emission rate. */
  emission: string
  tempo: number
}

export type SubnetData = Partial<SubnetPool> &
  Partial<SubnetSummary> & {
    name?: string
    symbol?: string
  }

export type ValidatorYield = TaoDataResponseData<
  TaoDataClient["subnets"]["listSubnetValidators"]
>[number]
