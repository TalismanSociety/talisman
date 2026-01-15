import type { Route } from "@lifi/sdk"
import type { SignerPayloadJSON } from "extension-core"

export interface ExecutionResult {
  success: boolean
  hash?: string
  error?: string
  requiresApproval?: boolean
  approvalData?: ApprovalData
}

export interface ApprovalData {
  tokenAddress: string
  spenderAddress: string
  amount: string
  chainId: number
  fromAddress: string
}

// Swap action params - stores the full LI.FI route for execution
export interface SwapRouteData {
  route: Route
  fromChainId: number
  toChainId: number
  fromTokenAddress: string
  toTokenAddress: string
  fromAddress: string
}

export interface SwapActionParams {
  from_token: string
  to_token: string
  amount: string
  from_chain?: string
  to_chain?: string
  slippage?: number
  routeData: SwapRouteData
}

// Transfer action params - stores resolved transaction data
export interface TransferTxData {
  tokenId: string
  networkId: string
  from: string
  to: string
  planck: string
  platform: "ethereum" | "polkadot" | "solana"
  tokenType: string
  contractAddress?: string
}

export interface TransferActionParams {
  token_symbol: string
  amount: string
  to_address: string
  chain_id?: string
  txData: TransferTxData
}

// Stake action params - stores staking configuration
export type StakingType = "nomination-pool" | "liquid-staking" | "bittensor"

export interface StakingData {
  tokenId: string
  networkId: string
  address: string
  planck: string
  poolId?: number | string
  validatorAddress?: string
  stakingType: StakingType
  genesisHash?: string
}

export interface StakeActionParams {
  token_symbol: string
  amount: string
  validator_address?: string
  pool_id?: number | string
  stakingData: StakingData
}

// Rebalance action params - stores trade execution data
export interface RebalanceTrade {
  fromTokenId: string
  toTokenId: string
  fromSymbol: string
  toSymbol: string
  amount: string
  routeData: SwapRouteData
}

export interface RebalanceActionParams {
  target_allocations: Array<{ token: string; percentage: number }>
  tolerance?: number
  trades: RebalanceTrade[]
}

// Substrate payload for staking transactions
export interface SubstrateStakingPayload {
  payload: SignerPayloadJSON
  txMetadata?: Uint8Array
}
