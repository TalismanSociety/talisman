import { log } from "extension-shared"

export interface YieldEnterRequest {
  yieldId: string
  address: string
  arguments: {
    amount: string
    [key: string]: string | number | boolean | string[] | undefined
  }
}

export interface YieldTransaction {
  id: string
  title: string
  network: string
  status: "PENDING" | "CONFIRMED" | "FAILED" | "SKIPPED"
  type: string
  hash?: string
  createdAt: string
  broadcastedAt?: string
  signedTransaction?: string
  unsignedTransaction: string
  annotatedTransaction: {
    method: string
    inputs: Record<string, string | number | boolean | string[] | undefined>
  }
  structuredTransaction: Record<string, unknown>
  stepIndex: number
  description: string
  error?: string
  gasEstimate:
    | string
    | {
        amount: string
        gasLimit: string
        token: {
          network: string
          name: string
          symbol: string
          decimals: number
          coinGeckoId: string
          logoURI: string
        }
      }
  explorerUrl?: string
  isMessage: boolean
}

export interface YieldEnterResponse {
  id: string
  intent: string
  type: string
  yieldId: string
  address: string
  amount: string
  amountRaw: string
  amountUsd: string
  transactions: YieldTransaction[]
  executionPattern: "synchronous" | "asynchronous"
  rawArguments: Record<string, string | number | boolean | string[] | undefined>
  createdAt: string
  completedAt?: string
  status: "PENDING" | "CONFIRMED" | "FAILED" | "CANCELED"
}

export interface YieldSubmitHashRequest {
  hash: string
}

export type YieldStatusResponse = YieldTransaction

class YieldApiService {
  private baseUrl = "https://api.yield.xyz/v1"
  private apiKey: string | null = null

  constructor() {
    // TODO: Get API key from remote config or environment
    this.apiKey = process.env.YIELD_API_KEY || null
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.apiKey) {
      throw new Error("Yield.xyz API key not configured")
    }

    const url = `${this.baseUrl}${endpoint}`
    const headers = {
      "Content-Type": "application/json",
      "X-API-KEY": this.apiKey,
      ...options.headers,
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { message: errorText }
        }

        throw new Error(`Yield.xyz API error: ${response.status} ${JSON.stringify(errorData)}`)
      }

      return await response.json()
    } catch (error) {
      log.error("Yield.xyz API request failed", { endpoint, error })
      throw error
    }
  }

  /**
   * Initiate a yield action (enter/exit) and get unsigned transactions
   */
  async enter(request: YieldEnterRequest): Promise<YieldEnterResponse> {
    return this.makeRequest<YieldEnterResponse>("/actions/enter", {
      method: "POST",
      body: JSON.stringify(request),
    })
  }

  /**
   * Submit transaction hash after broadcasting
   */
  async submitHash(
    transactionId: string,
    request: YieldSubmitHashRequest,
  ): Promise<YieldStatusResponse> {
    return this.makeRequest<YieldStatusResponse>(`/transactions/${transactionId}/submit-hash`, {
      method: "PUT",
      body: JSON.stringify(request),
    })
  }

  /**
   * Get transaction status
   */
  async getStatus(transactionId: string): Promise<YieldStatusResponse> {
    return this.makeRequest<YieldStatusResponse>(`/transactions/${transactionId}`)
  }

  /**
   * Poll transaction status until completion
   */
  async pollStatus(
    transactionId: string,
    onStatusUpdate?: (status: YieldStatusResponse) => void,
    intervalMs: number = 1000,
  ): Promise<YieldStatusResponse> {
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const status = await this.getStatus(transactionId)

          if (onStatusUpdate) {
            onStatusUpdate(status)
          }

          if (status.status === "CONFIRMED") {
            resolve(status)
          } else if (status.status === "FAILED") {
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
