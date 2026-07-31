import type { ValidatorYield } from "./dTao/types"

export type BondOption = {
  hotkey: string
  name: string
  totalStaked: number
  totalStakers: number
  hasData: boolean
  isError: boolean
  isRecommended?: boolean
  isFeatured: boolean
  featuredOrder: number
  validatorYield?: ValidatorYield
  apr: number
  subnets: number
  rank: number
  /** where the entry comes from: TaoData registry (mainnet, default) or on-chain metagraph (testnet) */
  source?: "registry" | "metagraph"
}
