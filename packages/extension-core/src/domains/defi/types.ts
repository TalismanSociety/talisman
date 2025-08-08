import { Loadable } from "@talismn/util"

export type DefiPositionItemType =
  | "deposit"
  | "loan"
  | "locked"
  | "staked"
  | "reward"
  | "airdrop"
  | "margin"

export type DefiPositionItem = {
  type: DefiPositionItemType
  contract_address: string | null
  symbol: string
  decimals: number
  name: string
  logo: string | null
  amount: string
  valueUsd: number
  valueUsdChange1d: number
}

export type DefiPosition = {
  address: string
  networkId: string
  defiId: string
  defiName: string
  defiLogoUrl: string | null
  defiUrl: string | null
  poolAddress: string | null
  symbol: string | null
  rewardsUsd: number
  rewardsUsdChange1d: number
  breakdown: DefiPositionItem[]
}

export type DefiPositionsResponse = Loadable<DefiPosition[]>

export interface DefiMessages {
  "pri(defi.positions.subscribe)": [null, boolean, DefiPositionsResponse]
}
