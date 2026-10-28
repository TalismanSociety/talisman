import { ROOT_NETUID } from "./constants"

export type BittensorYieldRateType = "APR" | "APY"

export const getBittensorYieldRateType = (netuid: number): BittensorYieldRateType =>
  netuid === ROOT_NETUID ? "APR" : "APY"
