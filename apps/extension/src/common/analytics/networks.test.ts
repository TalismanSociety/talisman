import type { Network } from "@talismn/chaindata-provider"
import { describe, expect, it } from "vitest"

import { savedNetworkId } from "./funds"
import { networkToggledOf, toRpcProvider } from "./networks"

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
    expect(toRpcProvider("http://alice-laptop.local.:8545")).toBeNull()
    expect(toRpcProvider("http://localhost.:8545")).toBeNull()
    expect(toRpcProvider("ipfs://bafy")).toBeNull()
    expect(toRpcProvider("not a url")).toBeNull()
    expect(toRpcProvider(undefined)).toBeNull()
  })
})

describe("savedNetworkId", () => {
  it("keeps Talisman's id and an Ethereum chain id, and hides a user-added genesis hash", () => {
    expect(savedNetworkId({ id: "polkadot", platform: "polkadot" }, true)).toBe("polkadot")
    expect(savedNetworkId({ id: "987654321", platform: "ethereum" }, false)).toBe("987654321")
    expect(savedNetworkId({ id: `0x${"ab".repeat(32)}`, platform: "polkadot" }, false)).toBe(
      "custom"
    )
  })

  it("names a toggled network as custom_network_saved does", () => {
    const network = { id: "987654321", platform: "ethereum", isTestnet: true } as Network
    expect(networkToggledOf(network, false, "settings")).toEqual({
      network_id: "987654321",
      platform: "ethereum",
      enabled: false,
      default_enabled: false,
      source: "settings",
    })
  })
})
