import type { SwapActionParams, SwapRouteData } from "../../actions/types"
import { setPendingAction } from "../../state/pendingActions"
import type { ToolHandler, ToolHandlerResult } from "../../types"
import { getSwapQuote } from "./getSwapQuote"

interface ExecuteSwapInput {
  from_token: string
  to_token: string
  amount: string
  from_chain?: string
  to_chain?: string
  slippage?: number
}

export const executeSwap: ToolHandler<ExecuteSwapInput> = async (
  input
): Promise<ToolHandlerResult> => {
  // First get a quote to show in preview
  const quoteResult = await getSwapQuote({
    from_token: input.from_token,
    to_token: input.to_token,
    amount: input.amount,
    from_chain: input.from_chain,
    to_chain: input.to_chain,
  })

  if (!quoteResult.success || !quoteResult.data) {
    return quoteResult
  }

  const quoteData = quoteResult.data as {
    fromToken: string
    toToken: string
    inputAmount: string
    fromChain: string
    toChain: string
    bestRoute: {
      outputAmount: string
      provider: string
      estimatedTime: string
      gasCost: string
    }
    routeData: SwapRouteData
  }

  const bestRoute = quoteData.bestRoute

  // Create pending action for user confirmation
  const actionId = crypto.randomUUID()

  // Build params with route data for execution
  const actionParams: SwapActionParams = {
    ...input,
    routeData: quoteData.routeData,
  }

  setPendingAction({
    id: actionId,
    type: "swap",
    params: actionParams,
    preview: {
      summary: `Swap ${input.amount} ${input.from_token} for ~${bestRoute.outputAmount} ${input.to_token}`,
      details: {
        fromToken: quoteData.fromToken,
        toToken: quoteData.toToken,
        inputAmount: quoteData.inputAmount,
        estimatedOutput: bestRoute.outputAmount,
        provider: bestRoute.provider,
        fromChain: quoteData.fromChain,
        toChain: quoteData.toChain,
        estimatedTime: bestRoute.estimatedTime,
        gasCost: bestRoute.gasCost,
        slippage: `${input.slippage || 0.5}%`,
      },
      warnings:
        parseFloat(bestRoute.outputAmount) < parseFloat(input.amount) * 0.9
          ? ["Output is significantly less than input - check rates before confirming"]
          : undefined,
    },
    status: "pending_confirmation",
  })

  return {
    success: true,
    requiresConfirmation: true,
    actionId,
    message: `I've prepared a swap of ${input.amount} ${input.from_token} for approximately ${bestRoute.outputAmount} ${input.to_token}. Please review and confirm the transaction in the confirmation dialog.`,
  }
}
