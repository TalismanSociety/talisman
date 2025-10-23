import { Loadable } from "@talismn/util"

// Key Type
type Key = {
  ss58: string
  hex: string
}

// Validator Data Type
export type BittensorValidator = {
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

export interface BittensorMessages {
  "pri(bittensor.validators.subscribe)": [null, boolean, Loadable<BittensorValidator[]>]
}
