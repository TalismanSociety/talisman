import {
  ActionArgumentsDto,
  BalancesRequestDto,
  sdk,
  SubmitHashDto,
  YieldBalancesRequestDto,
  YieldsControllerGetYieldsParams,
} from "@yieldxyz/sdk"
import { log, YIELD_API_BASE_URL, YIELD_API_KEY } from "extension-shared"

/**
 * Yield.xyz SDK configuration and service
 * Centralized configuration for all Yield API interactions
 */
class YieldSDKService {
  private initialized = false

  constructor() {
    this.initialize()
  }

  private initialize() {
    if (!YIELD_API_KEY) {
      log.error("[Yield SDK] No API key configured")
      return
    }

    try {
      sdk.configure({
        apiKey: YIELD_API_KEY,
        baseURL: YIELD_API_BASE_URL,
      })
      this.initialized = true
      log.debug("[Yield SDK] Configured successfully")
    } catch (error) {
      log.error("[Yield SDK] Configuration failed", { error })
    }
  }

  private ensureConfigured() {
    if (!this.initialized) {
      throw new Error("Yield SDK not configured: missing API key")
    }
  }

  /**
   * Get balances for multiple addresses
   */
  async getBalances(yieldId: string, queries: YieldBalancesRequestDto) {
    this.ensureConfigured()
    return sdk.api.getYieldBalances(yieldId, queries)
  }

  async getAggregateBalances(queries: BalancesRequestDto) {
    this.ensureConfigured()
    return sdk.api.getAggregateBalances(queries)
  }

  /**
   * Get yield products with optional filtering
   */
  async getYields(params?: YieldsControllerGetYieldsParams) {
    this.ensureConfigured()
    // Add high limit to get more than default 20 results
    const enhancedParams = {
      ...params,
      limit: params?.limit || 100,
    }
    return sdk.api.getYields(enhancedParams)
  }

  async getYield(yieldId: string) {
    this.ensureConfigured()
    return sdk.api.getYield(yieldId)
  }

  async getTransaction(transactionId: string) {
    this.ensureConfigured()
    return sdk.api.getTransaction(transactionId)
  }

  /**
   * Get validators for a specific yield
   */
  async getValidators(yieldId: string, params?: Record<string, unknown>) {
    this.ensureConfigured()
    // Add high limit to get more than default 20 results
    const enhancedParams = {
      ...params,
      limit: (params?.limit as number) || 100,
    }
    return sdk.api.getYieldValidators(yieldId, enhancedParams)
  }

  /**
   * Create an intent for yield actions (enter/exit/manage)
   */
  async createIntent(yieldId: string, address: string, args: ActionArgumentsDto | undefined) {
    this.ensureConfigured()
    return sdk.api.enterYield({
      yieldId,
      address,
      arguments: args,
    })
  }

  async submitTransactionHash(transactionId: string, hash: SubmitHashDto) {
    this.ensureConfigured()
    return sdk.api.submitTransactionHash(transactionId, hash)
  }
}

export const yieldSdk = new YieldSDKService()
