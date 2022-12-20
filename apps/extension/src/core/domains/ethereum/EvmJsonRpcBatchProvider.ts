import { ethers } from "ethers"
import { default as throttle } from "lodash/throttle"

type PendingRequest = {
  method: string
  params: unknown[]
  resolve: (value: unknown) => void
  reject: (reason?: unknown) => void
}

const BATCH_SIZE_LIMIT = 50 // requests
const BATCH_MAX_WAIT = 20 // milliseconds

export class EvmJsonRpcBatchProvider extends ethers.providers.JsonRpcProvider {
  private queue: PendingRequest[] = []
  private processQueue = throttle(this.sendBatch, BATCH_MAX_WAIT)

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
      .then((results) => {
        batch.forEach((request, index) => {
          const result = results[index]
          if (result.error) {
            const error = new Error(result.error.message)
            ;(error as any).code = result.error.code
            ;(error as any).data = result.error.data
            request.reject(error)
          } else {
            request.resolve(result.result)
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

    // call throttled batch processing anyway in case we're over the batch size limit
    this.processQueue()

    return result
  }
}
