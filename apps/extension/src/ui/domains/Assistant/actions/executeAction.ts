import type { PendingAction } from "../types"
import { executeRebalanceAction } from "./executeRebalanceAction"
import { executeStakeAction } from "./executeStakeAction"
import { executeSwapAction } from "./executeSwapAction"
import { executeTransferAction } from "./executeTransferAction"
import type { ApprovalData, ExecutionResult } from "./types"

export interface ExecuteActionOptions {
  onApprovalNeeded?: (data: ApprovalData) => Promise<boolean>
  onTradeProgress?: (completed: number, total: number, currentTrade: string) => void
}

export const executeAction = async (
  action: PendingAction,
  options: ExecuteActionOptions = {}
): Promise<ExecutionResult> => {
  const { onApprovalNeeded, onTradeProgress } = options

  switch (action.type) {
    case "transfer":
      return executeTransferAction(action)

    case "swap":
      return executeSwapAction(action, onApprovalNeeded)

    case "stake":
      return executeStakeAction(action)

    case "rebalance":
      return executeRebalanceAction(action, onApprovalNeeded, onTradeProgress)

    default:
      return {
        success: false,
        error: `Unknown action type: ${(action as PendingAction).type}`,
      }
  }
}

export { executeRebalanceAction } from "./executeRebalanceAction"
export { executeStakeAction } from "./executeStakeAction"
export { executeSwapAction } from "./executeSwapAction"
export { executeTransferAction } from "./executeTransferAction"
export * from "./types"
