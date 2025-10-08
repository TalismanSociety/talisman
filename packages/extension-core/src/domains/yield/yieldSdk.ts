import {
  BalancesRequestDto,
  sdk,
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
    return sdk.api.getYields(params || {})
  }

  /**
   * Get validators for a specific yield
   */
  async getValidators(yieldId: string) {
    this.ensureConfigured()
    return sdk.api.getYieldValidators(yieldId)
  }
}

export const yieldSdk = new YieldSDKService()
