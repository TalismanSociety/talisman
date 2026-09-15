import type { Address } from "@talismn/balances"
import type { NetworkId } from "@talismn/chaindata-provider"
import type { Loadable } from "@talismn/util"
import type { BalanceDto, YieldDto } from "@yieldxyz/sdk"

// Re-export SDK types for use in UI
export type {
  ActionArgumentsDto,
  ActionDto,
  ArgumentSchemaDto,
  BalanceDto,
  BalancesResponseDto,
  Networks,
  PendingActionDto,
  TimePeriodDto,
  TokenDto,
  TransactionDto,
  YieldBalancesDto,
  YieldDto,
} from "@yieldxyz/sdk"

export type YieldxyzProvider = {
  id: string
  name: string
  logoURI: string
  description: string
  website: string
  tvlUsd: object | null
  type: "protocol" | "validator_provider"
  references: string[]
}

export type YieldxyzPosition = {
  yieldId: string
  networkId: NetworkId
  address: Address
  balances: BalanceDto[]
}

export type YieldxyzPositionsResponse = Loadable<YieldxyzPosition[]>
export type YieldxyzOpportunitiesResponse = Loadable<YieldDto[]>
export type YieldxyzProvidersResponse = Loadable<YieldxyzProvider[]>

export type YieldxyzPositionRefreshRequest = {
  yieldId: string
  address: Address
}
