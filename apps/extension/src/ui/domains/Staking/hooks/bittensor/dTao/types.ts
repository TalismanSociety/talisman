import type { Enum } from "@polkadot-api/substrate-bindings"

type SevenDayPricePoint = {
  block_number: number
  timestamp: string // ISO string date format
  price: number | string
}

export type SubnetPool = {
  netuid: number
  total_tao: string
  total_alpha: string
  price: string
  price_change_1_day: string | null
  market_cap: string
  tao_volume_24_hr: string
  sellers_24h: number | string
  seven_day_prices: Array<number | string | SevenDayPricePoint>
}

export type SubnetSummary = {
  netuid: number
  emission: string
  tempo: number
}

export type SubnetData = Partial<SubnetPool> &
  Partial<SubnetSummary> & {
    name?: string
    symbol?: string
  }

export type ValidatorYield = {
  hotkey: string
  stake: number
  thirty_day_apy: number | null
  name?: string
  netuid?: number
  block_number?: number
  timestamp?: string
  one_hour_apy?: string
  one_day_apy?: string
  seven_day_apy?: string
  one_day_epoch_participation?: number | null
  seven_day_epoch_participation?: number | null
  thirty_day_epoch_participation?: number | null
}

export type RootClaimTypeEnum = Enum<{
  Swap: undefined
  Keep: undefined
  KeepSubnets: { subnets: number[] }
}>

export type RootClaimType = RootClaimTypeEnum["type"]
