import type { Loadable } from "@talismn/util"

export type BittensorValidator = {
  hotkey: string
  coldkey: string
  name: string | null
  rank: number
  active_subnets: number
  global_nominators: number
  global_weighted_stake: string
}

export interface BittensorMessages {
  "pri(bittensor.validators.subscribe)": [null, boolean, Loadable<BittensorValidator[]>]
}
