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

export type SubnetDescription = {
  netuid: string | number
  bittensor_id: string
  name: string
  description: string
  hw_requirements: string
  github: string
  image_url: string
}

export type SubnetApiDescriptionsResponse = {
  pagination: Pagination
  data: SubnetDescription[]
}

export type SubnetData = Partial<SubnetDescription> &
  Partial<SubnetPool> & {
    descriptionName?: string
  }
