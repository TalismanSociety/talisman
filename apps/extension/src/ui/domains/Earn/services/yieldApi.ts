import type {
  ActionDto,
  CreateActionDto,
  CreateManageActionDto,
  SubmitHashDto,
  TransactionDto,
  YieldsControllerGetYieldValidators200,
} from "extension-core"
import { yieldSdk } from "extension-core"
import { log } from "extension-shared"

class YieldApiService {
  /**
   * Initiate a yield action (enter/exit) and get unsigned transactions
   */
  async enter(request: CreateActionDto): Promise<ActionDto> {
    try {
      log.debug("[Yield API] Creating intent via SDK", { yieldId: request.yieldId })

      const result = await yieldSdk.createIntent(
        request.yieldId,
        request.address,
        request.arguments,
      )

      log.debug("[Yield API] Intent created", { result })
      return result as ActionDto
    } catch (error) {
      log.error("[Yield API] Failed to create intent", { error, request })
      throw error
    }
  }

  /**
   * Exit yield position and get unsigned transactions
   */
  async exit(request: CreateActionDto): Promise<ActionDto> {
    try {
      log.debug("[Yield API] Creating exit intent via SDK", { yieldId: request.yieldId })

      const result = await yieldSdk.exitYield(request.yieldId, request.address, request.arguments)

      log.debug("[Yield API] Exit intent created", { result })
      return result as ActionDto
    } catch (error) {
      log.error("[Yield API] Failed to create exit intent", { error, request })
      throw error
    }
  }

  /**
   * Submit transaction hash after broadcasting
   */
  async submitHash(transactionId: string, request: SubmitHashDto): Promise<TransactionDto> {
    try {
      log.debug("[Yield API] Submitting transaction hash via SDK", { transactionId })

      const result = await yieldSdk.submitTransactionHash(transactionId, request)

      log.debug("[Yield API] Transaction hash submitted", { result })
      return result as TransactionDto
    } catch (error) {
      log.error("[Yield API] Failed to submit transaction hash", { error, transactionId, request })
      throw error
    }
  }

  /**
   * Fetch user yield balances across networks
   */
  // async getYieldBalances(request: BalancesRequestDto): Promise<BalancesResponseDto> {
  //   try {
  //     log.debug("[Yield API] Fetching balances via SDK", { request })

  //     const result = await yieldSdk.getAggregateBalances(request)

  //     log.debug("[Yield API] Balances fetched", { result })
  //     return result as BalancesResponseDto
  //   } catch (error) {
  //     log.error("[Yield API] Failed to fetch balances", { error, request })
  //     throw error
  //   }
  // }

  /**
   * Fetch validators for a specific yield product
   */
  async getValidators(yieldId: string): Promise<YieldsControllerGetYieldValidators200> {
    try {
      log.debug("[Yield API] Fetching validators via SDK", { yieldId })

      const result = await yieldSdk.getValidators(yieldId)

      log.debug("[Yield API] Validators fetched", { result })
      return result as YieldsControllerGetYieldValidators200
    } catch (error) {
      log.error("[Yield API] Failed to fetch validators", { error, yieldId })
      throw error
    }
  }

  /**
   * Get transaction status
   */
  async getStatus(transactionId: string): Promise<TransactionDto> {
    try {
      log.debug("[Yield API] Getting transaction status via SDK", { transactionId })

      const result = await yieldSdk.getTransaction(transactionId)

      log.debug("[Yield API] Transaction status fetched", { result })
      return result as TransactionDto
    } catch (error) {
      log.error("[Yield API] Failed to get transaction status", { error, transactionId })
      throw error
    }
  }

  /**
   * Initiate a yield manage action (claim rewards, etc.) and get unsigned transactions
   */
  async manage(request: CreateManageActionDto): Promise<ActionDto> {
    try {
      log.debug("[Yield API] Creating manage action via SDK", {
        yieldId: request.yieldId,
        action: request.action,
      })

      const result = await yieldSdk.manageYield(
        request.yieldId,
        request.address,
        request.action,
        request.passthrough,
        request.arguments,
      )

      log.debug("[Yield API] Manage action created", { result })
      return result as ActionDto
    } catch (error) {
      log.error("[Yield API] Failed to create manage action", { error, request })
      throw error
    }
  }

  /**
   * Poll transaction status until completion
   */
  async pollStatus(
    transactionId: string,
    onStatusUpdate?: (status: TransactionDto) => void,
    intervalMs: number = 1000,
    timeoutMs: number = 300000, // 5 minutes timeout
  ): Promise<TransactionDto> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now()

      const poll = async () => {
        try {
          const elapsed = Date.now() - startTime

          if (elapsed > timeoutMs) {
            reject(new Error(`Transaction polling timed out after ${timeoutMs}ms`))
            return
          }

          // Use SDK getTransaction instead of custom getStatus
          const status = await yieldSdk.getTransaction(transactionId)

          if (onStatusUpdate) {
            onStatusUpdate(status as TransactionDto)
          }

          if (status.status === "CONFIRMED") {
            resolve(status as TransactionDto)
          }
          // else if (status.status === "BROADCASTED") {
          //   // Transaction has been successfully broadcasted to the network
          //   // For UI flow purposes, consider this successful
          //   resolve(status)
          // }
          else if (status.status === "FAILED") {
            reject(new Error(`Transaction failed: ${status.error || "Unknown error"}`))
          } else {
            // Still pending, continue polling
            setTimeout(poll, intervalMs)
          }
        } catch (error) {
          reject(error)
        }
      }

      poll()
    })
  }
}

export const yieldApi = new YieldApiService()
