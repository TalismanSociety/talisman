import type { Balances } from "@talismn/balances"
import type { Network } from "@talismn/chaindata-provider"
import { getNetworks$ } from "@ui/state/chaindata"
import { portfolioGlobalData$ } from "@ui/state/portfolio"
import { firstValueFrom, timeout } from "rxjs"
import type { StakeActionParams, StakingType } from "../../actions/types"
import { setPendingAction } from "../../state/pendingActions"
import type { ToolHandler, ToolHandlerResult } from "../../types"
import { getStakingOptions } from "./getStakingOptions"

interface ExecuteStakeInput {
  token_symbol: string
  amount: string
  validator_address?: string
  pool_id?: string
}

const PORTFOLIO_TIMEOUT_MS = 10000
const NETWORKS_TIMEOUT_MS = 5000

export const executeStake: ToolHandler<ExecuteStakeInput> = async (
  input
): Promise<ToolHandlerResult> => {
  // First check staking options and user balance
  const stakingResult = await getStakingOptions({
    token_symbol: input.token_symbol,
  })

  if (!stakingResult.success || !stakingResult.data) {
    return stakingResult
  }

  const stakingData = stakingResult.data as {
    stakingAvailable: boolean
    platforms?: Array<{ name: string; type: string; apy: string }>
    userBalance?: { balance: string; transferable: string; fiatValue: string }
  }

  if (!stakingData.stakingAvailable) {
    return {
      success: false,
      error: `Staking is not available for ${input.token_symbol}`,
    }
  }

  // Check user has sufficient balance with timeout to prevent hanging
  let portfolioBalances: Balances
  try {
    const portfolioData: Balances = await firstValueFrom(
      portfolioGlobalData$.pipe(
        timeout({
          first: PORTFOLIO_TIMEOUT_MS,
          with: () => {
            throw new Error("Timed out loading portfolio data. Please try again.")
          },
        })
      )
    )
    portfolioBalances = portfolioData.portfolioBalances
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load portfolio data",
    }
  }
  const lowerSymbol = input.token_symbol.toLowerCase()
  const userBalance = portfolioBalances.each.find(
    (b) => b.token?.symbol?.toLowerCase() === lowerSymbol
  )

  if (!userBalance) {
    return {
      success: false,
      error: `You don't have any ${input.token_symbol} to stake`,
    }
  }

  const availableBalance = parseFloat(userBalance.transferable.tokens || "0")
  const stakeAmount = parseFloat(input.amount)

  if (Number.isNaN(stakeAmount) || stakeAmount <= 0) {
    return {
      success: false,
      error: "Invalid stake amount",
    }
  }

  if (stakeAmount > availableBalance) {
    return {
      success: false,
      error: `Insufficient balance. You have ${availableBalance} ${input.token_symbol} available but tried to stake ${input.amount}`,
    }
  }

  // Get the best staking platform
  const platform = stakingData.platforms?.[0]

  // Create pending action for user confirmation
  const actionId = crypto.randomUUID()

  // Calculate planck amount
  const decimals = userBalance.token?.decimals || 18
  const amountPlanck = BigInt(Math.floor(stakeAmount * 10 ** decimals))

  // Get network info with timeout
  let networks: Network[]
  try {
    networks = await firstValueFrom(
      getNetworks$({ activeOnly: true }).pipe(
        timeout({
          first: NETWORKS_TIMEOUT_MS,
          with: () => {
            throw new Error("Timed out loading network data. Please try again.")
          },
        })
      )
    )
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load network data",
    }
  }
  const network = networks.find((n) => n.id === userBalance.networkId)

  // Determine staking type based on token/platform
  let stakingType: StakingType = "nomination-pool"
  const symbol = input.token_symbol.toUpperCase()
  if (symbol === "TAO") {
    stakingType = "bittensor"
    input.validator_address = "5FtBncJvGhxjBs4aFn2pid6aur9tBUuo9QR7sHe5DkoRizzo"
  } else if (symbol === "ETH" && platform?.type === "Liquid Staking") {
    stakingType = "liquid-staking"
  }
  // TODO , the validator address should have a reasonable default for everything

  // Build staking data for execution
  const stakingDataForExecution: StakeActionParams["stakingData"] = {
    tokenId: userBalance.tokenId,
    networkId: userBalance.networkId,
    address: userBalance.address,
    planck: amountPlanck.toString(),
    poolId: input.pool_id ? parseInt(input.pool_id, 10) : undefined,
    validatorAddress: input.validator_address,
    stakingType,
    genesisHash: network && "genesisHash" in network ? network.genesisHash : undefined,
  }

  // Build action params
  const actionParams: StakeActionParams = {
    ...input,
    stakingData: stakingDataForExecution,
  }

  setPendingAction({
    id: actionId,
    type: "stake",
    params: actionParams,
    preview: {
      summary: `Stake ${input.amount} ${input.token_symbol}${platform ? ` via ${platform.name}` : ""}`,
      details: {
        token: input.token_symbol.toUpperCase(),
        amount: input.amount,
        platform: platform?.name || "Default",
        type: platform?.type || "Staking",
        expectedApy: platform?.apy || "Variable",
        validatorAddress: input.validator_address,
        poolId: input.pool_id,
        currentBalance: userBalance.total.tokens,
        remainingAfterStake: (availableBalance - stakeAmount).toFixed(6),
      },
      warnings:
        stakeAmount > availableBalance * 0.9
          ? [
              "You are staking most of your available balance. Make sure to keep some for transaction fees.",
            ]
          : undefined,
    },
    status: "pending_confirmation",
  })

  return {
    success: true,
    requiresConfirmation: true,
    actionId,
    message: `I've prepared to stake ${input.amount} ${input.token_symbol}${platform ? ` via ${platform.name}` : ""}. Expected APY: ${platform?.apy || "Variable"}. Please review and confirm the transaction.`,
  }
}
