import { log } from "@common/log"
import { decryptPjsKeystore, type PjsKeystore } from "@talismn/crypto"

import DecryptKeystoreWorker from "./decryptKeystore.worker?worker"
import type { DecryptKeystoreRequest, DecryptKeystoreResponse } from "./decryptKeystoreMessages"

type Pending = {
  keystore: PjsKeystore
  password: string
  resolve: (payload: Uint8Array) => void
  reject: (err: unknown) => void
}

let worker: Worker | null = null
// once the worker itself fails (not a bad password - a load/crash failure), stop trying:
// decrypt in-thread instead. Blocking beats broken.
let isWorkerBroken = false
let requestId = 0
const pending = new Map<number, Pending>()

const decryptInThread = ({ keystore, password, resolve, reject }: Pending) => {
  try {
    resolve(decryptPjsKeystore(keystore, password))
  } catch (err) {
    reject(err)
  }
}

const onWorkerFailure = (reason: string) => {
  log.warn(`[decryptKeystore] ${reason} - falling back to in-thread decryption`)
  isWorkerBroken = true
  worker?.terminate()
  worker = null

  // settle in-flight requests in-thread so they don't hang forever
  const inFlight = [...pending.values()]
  pending.clear()
  for (const req of inFlight) decryptInThread(req)
}

const getWorker = (): Worker | null => {
  if (worker) return worker

  try {
    worker = new DecryptKeystoreWorker()
  } catch (err) {
    log.warn("[decryptKeystore] failed to construct worker", { err })
    isWorkerBroken = true
    return null
  }

  worker.onmessage = (event: MessageEvent<DecryptKeystoreResponse>) => {
    const req = pending.get(event.data.id)
    if (!req) return
    pending.delete(event.data.id)

    if (event.data.ok) req.resolve(event.data.payload)
    else req.reject(new Error(event.data.error))
  }

  worker.onerror = () => onWorkerFailure("worker failed")
  worker.onmessageerror = () => onWorkerFailure("worker message error")

  return worker
}

/**
 * Decrypts a polkadot-js keystore without blocking the UI thread: the scrypt key
 * derivation (up to N=2^17, seconds of CPU) runs in a dedicated worker.
 *
 * Decrypts in-thread (blocking) where workers are unavailable or broken
 * (unit tests, worker bootstrap failure).
 */
export const decryptPjsKeystoreOffThread = (
  keystore: PjsKeystore,
  password: string
): Promise<Uint8Array> => {
  return new Promise<Uint8Array>((resolve, reject) => {
    const request: Pending = { keystore, password, resolve, reject }

    if (typeof Worker === "undefined" || isWorkerBroken) return decryptInThread(request)

    const readyWorker = getWorker()
    if (!readyWorker) return decryptInThread(request)

    const id = requestId++
    pending.set(id, request)
    readyWorker.postMessage({ id, keystore, password } satisfies DecryptKeystoreRequest)
  })
}
