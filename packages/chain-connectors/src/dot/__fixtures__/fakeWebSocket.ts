/**
 * A minimal WebSocket class for the ws provider whose server at each url
 * answers `chain_getBlockHash` with that url's genesis hash and any other
 * method with `${method}@${url}`. Every message sent is recorded in `seen` as
 * [url, method].
 */
export const fakeWebSocketClass = (
  genesisByUrl: Record<string, string>,
  seen: [string, string][]
) =>
  class FakeWebSocket {
    url: string
    listeners = new Map<string, Set<(event: unknown) => void>>()
    constructor(url: string) {
      this.url = url
      setTimeout(() => this.emit("open", {}), 0)
    }
    addEventListener(type: string, fn: (event: unknown) => void) {
      if (!this.listeners.has(type)) this.listeners.set(type, new Set())
      this.listeners.get(type)!.add(fn)
    }
    removeEventListener(type: string, fn: (event: unknown) => void) {
      this.listeners.get(type)?.delete(fn)
    }
    emit(type: string, event: unknown) {
      for (const fn of this.listeners.get(type) ?? []) fn(event)
    }
    send(data: string) {
      const { id, method } = JSON.parse(data)
      seen.push([this.url, method])
      const result =
        method === "chain_getBlockHash" ? genesisByUrl[this.url] : `${method}@${this.url}`
      setTimeout(
        () => this.emit("message", { data: JSON.stringify({ jsonrpc: "2.0", id, result }) }),
        0
      )
    }
    close() {
      setTimeout(() => this.emit("close", {}), 0)
    }
  }
