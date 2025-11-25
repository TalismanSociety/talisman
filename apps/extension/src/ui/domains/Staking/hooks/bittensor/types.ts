import { type ValidatorYield } from "./dTao/types"

type Pagination = {
  current_page: number
  per_page: number
  total_items: number
  total_pages: number
  next_page: number | null
  prev_page: number | null
}

// Key Type
type Key = {
  ss58: string
  hex: string
}

// Validator Data Type
export type ValidatorData = {
  hotkey: Key
  coldkey: Key
  name: string
  block_number: number
  timestamp: string
  created_on_date: string
  rank: number
  root_rank: number
  alpha_rank: number
  active_subnets: number
  global_nominators: number
  global_nominators_24_hr_change: number
  take: string
  global_weighted_stake: string
  global_weighted_stake_24_hr_change: string
  global_alpha_stake_as_tao: string
  root_stake: string
  weighted_root_stake: string
  dominance: string
  dominance_24_hr_change: string
  nominator_return_per_day: string
  validator_return_per_day: string
}

export type ValidatorsData = {
  pagination: Pagination
  data: ValidatorData[]
}

export type BondOption = {
  hotkey: string
  name: string
  totalStaked: number
  totalStakers: number
  hasData: boolean
  isError: boolean
  isRecommended?: boolean
  validatorYield?: ValidatorYield
  apr: number
  subnets: number
  rank: number
}

type Address = {
  ss58: string
  hex: string
}

type DelegateData = {
  nominator: Address
  delegate: Address
  block_number: number
  timestamp: string // ISO date string
  balance: string // Big number represented as a string
  delegate_from: number
  delegate_from_timestamp: string // ISO date string
}

export type DelegatesData = {
  pagination: Pagination
  data: DelegateData[]
}
