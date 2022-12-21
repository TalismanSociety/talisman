import { ethers } from "ethers"
import { default as debounce } from "lodash/debounce"

type PendingRequest = {
  method: string
  params: unknown[]
  resolve: (value: unknown) => void
  reject: (reason?: unknown) => void
}

type BatchItemResult = {
  id: number
  result?: unknown
  error?: { message: string; code?: unknown; data?: unknown }
}

const BATCH_SIZE_LIMIT = 50 // requests
const BATCH_MAX_WAIT = 10 // milliseconds

export class EvmJsonRpcBatchProvider extends ethers.providers.StaticJsonRpcProvider {
  private queue: PendingRequest[] = []
  private processQueue = debounce(this.sendBatch, BATCH_MAX_WAIT)

  private sendBatch() {
    if (this.queue.length === 0) return

    const batch = this.queue.splice(0, BATCH_SIZE_LIMIT).map((req, index) => ({
      ...(req as Required<PendingRequest>),
      id: index + 1,
      jsonrpc: "2.0",
    }))

    const payload = batch.map(({ method, params, id, jsonrpc }) => ({
      method,
      params,
      id,
      jsonrpc,
    }))

    ethers.utils
      .fetchJson(this.connection, JSON.stringify(payload))
      .then((results: BatchItemResult[]) => {
        batch.forEach((request) => {
          // find by id as order is not guaranteed to be the same as the request order
          const { result, error } = results.find((res) => res.id === request.id) as BatchItemResult
          if (error) {
            const err = new Error(error.message)
            ;(err as any).code = error.code
            ;(err as any).data = error.data
            request.reject(err)
          } else {
            request.resolve(result)
          }
        })
      })
      .catch((err) => {
        // emit error to cycle fallback provider
        this.emit("error", err)

        // reject all requests using a custom error message that will prevent more fallback cycling
        batch.forEach((request) => {
          request.reject(new Error(err.message, { cause: "BATCH_FAILED" }))
        })
      })
  }

  send(method: string, params: unknown[]): Promise<unknown> {
    const request: Partial<PendingRequest> = { method, params }

    const result = new Promise((resolve, reject) => {
      // will be resolved/rejected from the sendBatch method
      request.resolve = resolve
      request.reject = reject
    })

    this.queue.push(request as PendingRequest)

    // force batch to be processed if batch size is reached
    if (this.queue.length >= BATCH_SIZE_LIMIT) this.processQueue.flush()

    // call debounced batch processing anyway in case we're over the batch size limit
    this.processQueue()

    return result
  }
}
