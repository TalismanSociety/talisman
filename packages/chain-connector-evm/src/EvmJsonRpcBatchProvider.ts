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
        if (!Array.isArray(results)) throw new Error("Invalid batch response")

        // order is not guaranteed, prepare a map to access items by their id
        const resultsMap = results.reduce(
          (map, result) => map.set(result.id, result),
          new Map<number, BatchItemResult>()
        )
        batch.forEach((request) => {
          const batchItem = resultsMap.get(request.id)
          if (!batchItem) return request.reject(new Error("Missing batch item"))

          const { result, error } = batchItem
          if (error) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const err: any = new Error(error.message)
            err.code = error.code
            err.data = error.data
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
          request.reject(new Error("BATCH_FAILED", { cause: err }))
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
