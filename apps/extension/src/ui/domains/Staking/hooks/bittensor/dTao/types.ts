import { Enum } from "@polkadot-api/substrate-bindings"

type Pagination = {
  current_page: number
  per_page: number
  total_items: number
  total_pages: number
  next_page: number | null
  prev_page: number | null
}

type SevenDayPrice = {
  block_number: number
  timestamp: string // ISO string date format
  price: string // Keeping it as string since it's returned as string
}

export type SubnetPool = {
  netuid: number | string
  block_number: number
  timestamp: string
  name: string
  symbol: string
  market_cap: string
  liquidity: string
  total_tao: string
  total_alpha: string
  alpha_in_pool: string
  alpha_staked: string
  price: string
  price_change_1_hour: string | null
  price_change_1_day: string | null
  price_change_1_week: string | null
  tao_volume_24_hr: string
  tao_buy_volume_24_hr: string
  tao_sell_volume_24_hr: string
  seven_day_prices: SevenDayPrice[]
  buys_24_hr: number
  sells_24_hr: number
  buyers_24_hr: number
  sellers_24_hr: number
}

export type SubnetApiResponse = {
  pagination: Pagination
  data: SubnetPool[]
}
type SubnetIdentity = {
  netuid: number
  subnet_name: string
  github_repo: string | null
  subnet_contact: string | null
  subnet_url: string | null
  discord: string | null
  description: string | null
  additional: string | null
}

export type SubnetApiDescriptionsResponse = {
  pagination: Pagination
  data: SubnetIdentity[]
}

export type SubnetData = Partial<SubnetIdentity> &
  Partial<SubnetPool> &
  Partial<Subnet> & {
    descriptionName?: string
  }

export type ValidatorYield = {
  hotkey: {
    ss58: string
    hex: string
  }
  name: string
  netuid: number
  block_number: number
  timestamp: string
  stake: string
  one_hour_apy: string
  one_day_apy: string
  seven_day_apy: string
  thirty_day_apy: string
  one_day_epoch_participation: number | null
  seven_day_epoch_participation: number | null
  thirty_day_epoch_participation: number | null
}

export type ValidatorsYieldApiResponse = {
  pagination: Pagination
  data: ValidatorYield[]
}

export type Subnet = {
  block_number: number
  timestamp: string // ISO-8601
  netuid: number

  owner: {
    ss58: string
    hex: string
  }

  registration_block_number: number | null
  registration_timestamp: string

  /** Many numeric fields are delivered as strings to avoid JS number limits */
  registration_cost: string
  neuron_registration_cost: string

  max_neurons: number
  neuron_registrations_this_interval: number

  active_keys: number
  validators: number
  active_validators: number
  active_miners: number
  active_dual: number

  modality: number
  pow_registration_allowed: boolean
  emission: string

  rho: number
  kappa: number
  immunity_period: number

  min_allowed_weights: number
  max_weights_limit: number
  tempo: number

  min_difficulty: string
  max_difficulty: string

  weights_version: string
  weights_rate_limit: string

  adjustment_interval: number
  activity_cutoff: number
  registration_allowed: boolean
  target_regs_per_interval: number

  min_burn: string
  max_burn: string
  bonds_moving_avg: string

  max_regs_per_block: number
  serving_rate_limit: string
  max_validators: number

  adjustment_alpha: string
  difficulty: string

  last_adjustment_block: number
  blocks_since_last_step: number
  blocks_until_next_epoch: number
  blocks_until_next_adjustment: number

  recycled_lifetime: string
  recycled_24_hours: string
  recycled_since_registration: string

  liquid_alpha_enabled: boolean
  alpha_high: string
  alpha_low: string

  commit_reveal_weights_interval: number
  commit_reveal_weights_enabled: boolean
}

export type SubnetsData = {
  pagination: Pagination
  data: Subnet[]
}

export type RootClaimTypeEnum = Enum<{
  Swap: undefined
  Keep: undefined
  KeepSubnets: undefined
}>

export type RootClaimType = RootClaimTypeEnum["type"]
