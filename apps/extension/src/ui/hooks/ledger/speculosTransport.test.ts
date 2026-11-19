import { createServer, type Server } from "node:http"
import type { AddressInfo } from "node:net"

import { TransportError } from "@ledgerhq/hw-transport"

import { SpeculosHttpTransport } from "./speculosTransport"

const requests: { method: string; path: string; body: string }[] = []

const listen = (server: Server) =>
  new Promise<string>((resolve) =>
    server.listen(0, "127.0.0.1", () => {
      resolve(`http://127.0.0.1:${(server.address() as AddressInfo).port}`)
    })
  )

const json = (body: unknown) => JSON.stringify(body)

const speculos = createServer((req, res) => {
  let body = ""
  req.on("data", (chunk) => {
    body += chunk
  })
  req.on("end", () => {
    const { pathname, search } = new URL(req.url ?? "/", "http://localhost")
    requests.push({ method: req.method ?? "", path: pathname + search, body })
    const reply = (status: number, text: string) => res.writeHead(status).end(text)
    if (pathname === "/slow/apdu") setTimeout(() => reply(200, json({ data: "9000" })), 200)
    else if (pathname === "/html/apdu") reply(200, "<html></html>")
    else if (pathname === "/apdu") reply(200, json({ data: "31109000" }))
    else if (pathname === "/events") reply(200, json({ events: [] }))
    else reply(404, "not found")
  })
})

let url: string
let stoppedUrl: string

beforeAll(async () => {
  url = await listen(speculos)
  const stopped = createServer()
  stoppedUrl = await listen(stopped)
  await new Promise((resolve) => stopped.close(resolve))
})

afterAll(() => {
  speculos.closeAllConnections()
  speculos.close()
})

beforeEach(() => {
  requests.length = 0
})

const countDisconnects = (transport: SpeculosHttpTransport) => {
  const counter = { disconnects: 0 }
  transport.on("disconnect", () => counter.disconnects++)
  return counter
}

describe("SpeculosHttpTransport", () => {
  it("posts the APDU as hex and returns the response bytes with the status word", async () => {
    const transport = await SpeculosHttpTransport.open(url)
    requests.length = 0

    const response = await transport.exchange(Buffer.from([0xe0, 0x01, 0x00, 0x00, 0x00]))

    expect(requests).toEqual([{ method: "POST", path: "/apdu", body: '{"data":"e001000000"}' }])
    expect(response.toString("hex")).toBe("31109000")
  })

  it("probes the emulator screen on open", async () => {
    await SpeculosHttpTransport.open(url)

    expect(requests).toEqual([{ method: "GET", path: "/events?currentscreenonly=true", body: "" }])
  })

  it("rejects open when the emulator is not running", async () => {
    await expect(SpeculosHttpTransport.open(stoppedUrl)).rejects.toThrow(
      `Could not connect to the Ledger emulator at ${stoppedUrl}`
    )
  })

  it("emits disconnect when an exchange fails", async () => {
    const transport = new SpeculosHttpTransport(stoppedUrl)
    const counter = countDisconnects(transport)

    await expect(transport.exchange(Buffer.from([0xe0]))).rejects.toThrow(
      "Could not connect to the Ledger emulator"
    )
    expect(counter.disconnects).toBe(1)
  })

  it("emits disconnect on an HTTP error", async () => {
    const transport = new SpeculosHttpTransport(`${url}/missing`)
    const counter = countDisconnects(transport)

    await expect(transport.exchange(Buffer.from([0xe0]))).rejects.toThrow(
      "Ledger emulator disconnected: /apdu returned HTTP 404"
    )
    expect(counter.disconnects).toBe(1)
  })

  it("rejects an in-flight exchange on close and emits disconnect once", async () => {
    const transport = new SpeculosHttpTransport(`${url}/slow`)
    const counter = countDisconnects(transport)

    const exchange = transport.exchange(Buffer.from([0xe0]))
    await new Promise((resolve) => setTimeout(resolve, 20))
    await transport.close()

    await expect(exchange).rejects.toThrow("Could not connect to the Ledger emulator")
    expect(counter.disconnects).toBe(1)
  })

  it("rejects a second exchange while one is pending", async () => {
    const transport = new SpeculosHttpTransport(`${url}/slow`)

    const first = transport.exchange(Buffer.from([0xe0]))
    const second = transport.exchange(Buffer.from([0xe0]))

    expect(await second.catch((error: Error) => error.name)).toBe("TransportRaceCondition")
    expect((await first).toString("hex")).toBe("9000")
  })

  it("treats a response without hex data as a lost connection", async () => {
    const transport = new SpeculosHttpTransport(`${url}/html`)
    const counter = countDisconnects(transport)

    const error = await transport.exchange(Buffer.from([0xe0])).catch((e: Error) => e)

    expect(error).toBeInstanceOf(TransportError)
    expect((error as Error).message).toBe(
      "Ledger emulator disconnected: /apdu returned no hex data"
    )
    expect(counter.disconnects).toBe(1)
  })
})
