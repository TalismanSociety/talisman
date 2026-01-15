import type { ToolHandlerResult } from "../types"
// Bittensor tools
import { getSubnetSentiment } from "./bittensor/getSubnetSentiment"
import { getGasEstimate } from "./portfolio/getGasEstimate"
// Portfolio tools
import { getPortfolioSummary } from "./portfolio/getPortfolioSummary"
import { getTokenBalance } from "./portfolio/getTokenBalance"
// Rebalance tools
import { rebalancePortfolio } from "./rebalance/rebalancePortfolio"
import { executeStake } from "./staking/executeStake"
// Staking tools
import { getStakingOptions } from "./staking/getStakingOptions"
import { executeSwap } from "./swap/executeSwap"
// Swap tools
import { getSwapQuote } from "./swap/getSwapQuote"
import { analyzeTransaction } from "./transactions/analyzeTransaction"
// Transaction tools
import { getTransactionHistory } from "./transactions/getTransactionHistory"
// Transfer tools
import { sendTokens } from "./transfer/sendTokens"

// Generic tool handler type for the registry
type GenericToolHandler = (input: unknown) => Promise<ToolHandlerResult>

// Tool registry - using type assertion since individual tools have stricter types
const toolRegistry: Record<string, GenericToolHandler> = {
  // Read tools
  get_portfolio_summary: getPortfolioSummary as GenericToolHandler,
  get_token_balance: getTokenBalance as GenericToolHandler,
  get_gas_estimate: getGasEstimate as GenericToolHandler,
  get_swap_quote: getSwapQuote as GenericToolHandler,
  get_staking_options: getStakingOptions as GenericToolHandler,
  get_transaction_history: getTransactionHistory as GenericToolHandler,
  analyze_transaction: analyzeTransaction as GenericToolHandler,
  get_subnet_sentiment: getSubnetSentiment as GenericToolHandler,

  // Write tools (require confirmation)
  execute_swap: executeSwap as GenericToolHandler,
  execute_stake: executeStake as GenericToolHandler,
  send_tokens: sendTokens as GenericToolHandler,
  rebalance_portfolio: rebalancePortfolio as GenericToolHandler,
}

export const executeToolCall = async (
  toolName: string,
  input: Record<string, unknown>
): Promise<ToolHandlerResult> => {
  const handler = toolRegistry[toolName]

  if (!handler) {
    return {
      success: false,
      error: `Unknown tool: ${toolName}`,
    }
  }

  try {
    return await handler(input)
  } catch (error) {
    return {
      success: false,
      error: `Tool execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

export const isToolAvailable = (toolName: string): boolean => {
  return toolName in toolRegistry
}

// Re-export individual tools for direct access if needed
export {
  getPortfolioSummary,
  getTokenBalance,
  getGasEstimate,
  getSwapQuote,
  executeSwap,
  getStakingOptions,
  executeStake,
  sendTokens,
  getTransactionHistory,
  analyzeTransaction,
  rebalancePortfolio,
  getSubnetSentiment,
}
