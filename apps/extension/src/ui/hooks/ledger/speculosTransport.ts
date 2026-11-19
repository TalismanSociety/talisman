import Transport, { TransportError } from "@ledgerhq/hw-transport"

// The port `pnpm ledger:emulator` publishes by default (SPECULOS_API_PORT).
export const LEDGER_EMULATOR_URL = "http://127.0.0.1:5001"

/**
 * Talks to the Speculos Ledger emulator over its REST API: `POST /apdu {"data": "<hex>"}`,
 * answered with the response bytes and the status word in one hex string.
 * Dev builds only, see docs/ledger-emulator.md.
 */
export class SpeculosHttpTransport extends Transport {
  readonly url: string
  private readonly abortController = new AbortController()
  private disconnected = false

  constructor(url: string) {
    super()
    this.url = url
  }

  /** Probes the emulator so that a stopped one fails here, not at the first APDU. */
  static async open(url: string): Promise<SpeculosHttpTransport> {
    const transport = new SpeculosHttpTransport(url)
    await transport.request("/events?currentscreenonly=true")
    return transport
  }

  exchange(apdu: Buffer): Promise<Buffer> {
    return this.exchangeAtomicImpl(async () => {
      const response = await this.request("/apdu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: apdu.toString("hex") }),
      })
      const body = (await response.json().catch(() => null)) as { data?: unknown } | null
      const data = body?.data
      if (typeof data !== "string") {
        this.disconnect()
        throw new TransportError(
          "Ledger emulator disconnected: /apdu returned no hex data",
          "SpeculosBadResponse"
        )
      }
      return Buffer.from(data, "hex")
    })
  }

  async close(): Promise<void> {
    this.abortController.abort()
    this.disconnect()
  }

  // A "disconnect" listener drops the cached transport, which by then can be a newer one,
  // so each instance emits it at most once.
  private disconnect() {
    if (this.disconnected) return
    this.disconnected = true
    this.emit("disconnect")
  }

  private async request(path: string, init?: RequestInit): Promise<Response> {
    let response: Response
    try {
      response = await fetch(`${this.url}${path}`, {
        ...init,
        signal: this.abortController.signal,
      })
    } catch {
      this.disconnect()
      throw new TransportError(
        `Could not connect to the Ledger emulator at ${this.url}. Run pnpm ledger:emulator start.`,
        "SpeculosUnreachable"
      )
    }
    if (!response.ok) {
      this.disconnect()
      throw new TransportError(
        `Ledger emulator disconnected: ${path} returned HTTP ${response.status}`,
        "SpeculosHttpError"
      )
    }
    return response
  }
}
