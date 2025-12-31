import { Address } from "@talismn/balances"
import { NetworkId } from "@talismn/chaindata-provider"
import { Loadable } from "@talismn/util"
import { BalanceDto, YieldDto } from "@yieldxyz/sdk"

// TODO rename everything as yieldxyz
// Re-export SDK types for use in UI
export type {
  ActionArgumentsDto,
  ActionDto,
  ArgumentFieldDto,
  ArgumentSchemaDto,
  BalanceDto,
  BalancesRequestDto,
  BalancesResponseDto,
  CreateActionDto,
  CreateManageActionDto,
  HealthStatusDto,
  NetworkDto,
  Networks,
  PendingActionDto,
  ProviderDto,
  SubmitHashDto,
  TimePeriodDto,
  TokenDto,
  TransactionDto,
  ValidatorDto,
  YieldBalancesDto,
  YieldBalancesRequestDto,
  YieldDto,
  YieldsControllerGetYieldsParams,
  YieldsControllerGetYieldValidators200,
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
