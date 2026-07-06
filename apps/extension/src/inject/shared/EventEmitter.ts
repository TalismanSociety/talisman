// biome-ignore lint/suspicious/noExplicitAny: listeners have arbitrary dapp-defined signatures
type Listener = (...args: any[]) => unknown

/**
 * Minimal event emitter for the injected page providers, replacing the `events` npm polyfill
 * (~7 KB of page.js). Implements only the surface the EIP-1193 ethereum provider and the Solana
 * wallet-standard provider use: on/off (+ addListener/removeListener aliases), removeAllListeners
 * and emit.
 *
 * Listener errors are isolated so a misbehaving dapp handler can neither break our emit flow nor
 * leak an unhandled promise rejection — the protection the `events` polyfill silently dropped by
 * ignoring the Node-only `captureRejections` option.
 */
export class EventEmitter {
  #listeners = new Map<string, Set<Listener>>()

  on(event: string, listener: Listener): this {
    const listeners = this.#listeners.get(event) ?? new Set<Listener>()
    listeners.add(listener)
    this.#listeners.set(event, listeners)
    return this
  }

  addListener(event: string, listener: Listener): this {
    return this.on(event, listener)
  }

  off(event: string, listener: Listener): this {
    this.#listeners.get(event)?.delete(listener)
    return this
  }

  removeListener(event: string, listener: Listener): this {
    return this.off(event, listener)
  }

  removeAllListeners(event?: string): this {
    if (event === undefined) this.#listeners.clear()
    else this.#listeners.delete(event)
    return this
  }

  emit(event: string, ...args: unknown[]): boolean {
    const listeners = this.#listeners.get(event)
    if (!listeners?.size) return false

    // iterate a copy so handlers that add/remove listeners during dispatch don't disrupt it
    for (const listener of [...listeners]) {
      try {
        const result = listener(...args)
        if (result instanceof Promise) result.catch(() => {})
      } catch {
        // isolate sync listener errors so one bad dapp handler can't break our provider
      }
    }
    return true
  }
}
