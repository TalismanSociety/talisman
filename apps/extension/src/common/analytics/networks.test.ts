import { describe, expect, it } from "vitest"

import { toRpcProvider } from "./networks"

describe("toRpcProvider", () => {
  it("keeps the registrable domain and drops the path and subdomains", () => {
    expect(toRpcProvider("https://eth-mainnet.g.alchemy.com/v2/secret-key")).toBe("alchemy.com")
    expect(toRpcProvider("wss://customer-name.quiknode.pro/abc")).toBe("quiknode.pro")
    expect(toRpcProvider("https://rpc.example.co.uk")).toBe("example.co.uk")
  })

  it("reads null for a self-hosted node or a URL that is not an RPC", () => {
    expect(toRpcProvider("http://localhost:8545")).toBeNull()
    expect(toRpcProvider("http://192.168.1.10:8545")).toBeNull()
    expect(toRpcProvider("http://[::1]:8545")).toBeNull()
    expect(toRpcProvider("http://node.lan")).toBeNull()
    expect(toRpcProvider("ipfs://bafy")).toBeNull()
    expect(toRpcProvider("not a url")).toBeNull()
    expect(toRpcProvider(undefined)).toBeNull()
  })
})
