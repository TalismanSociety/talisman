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
  validatorYield?: ValidatorYield
  apr: number
  subnets: number
  rank: number
}
