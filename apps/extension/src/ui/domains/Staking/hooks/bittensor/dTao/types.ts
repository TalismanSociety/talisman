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
  Partial<SubnetPool> & {
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
