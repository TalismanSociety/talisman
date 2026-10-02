import { catalogue, type EventName } from "@common/analytics/catalogue"
import type { EventProperties } from "@common/analytics/schema"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { MessageTypes } from "../../types"
import { observeDappMessage } from "./dappMessages"

type TrackedCall = [event: EventName, props?: EventProperties]

const tracked = vi.hoisted(() => ({ calls: [] as TrackedCall[] }))
vi.mock("./track", () => ({
  track: (...call: TrackedCall) => {
    tracked.calls.push(call)
  },
}))

const state = vi.hoisted(() => ({
  requests: {} as Record<string, unknown>,
  networks: {} as Record<string, unknown>,
  tokens: {} as Record<string, unknown>,
  sites: {} as Record<string, unknown>,
}))

vi.mock("../../libs/requests/store", () => ({
  requestStore: { getRequest: (id: string) => state.requests[id] },
}))
vi.mock("../../rpcs/chaindata", () => ({
  chaindataProvider: {
    getNetworkById: async (id: string) => state.networks[id] ?? null,
    getTokenById: async (id: string) => state.tokens[id] ?? null,
  },
}))
vi.mock("../sitesAuthorised/store", () => ({
  default: { get: async (id?: string) => (id === undefined ? state.sites : state.sites[id]) },
}))

const DAPP_URL = "https://app.example.com/swap"
const CHAIN_ID = "8453"
const TOKEN_ID = `${CHAIN_ID}:evm-erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913`

const handle = async (type: MessageTypes, request: unknown, afterHandler?: () => void) => {
  const settle = observeDappMessage(type, request)
  afterHandler?.()
  await settle?.()
}

const network = {
  id: CHAIN_ID,
  platform: "ethereum",
  isTestnet: false,
  rpcs: ["https://base.g.alchemy.com/v2/key"],
}

describe("dapp messages", () => {
  beforeEach(() => {
    tracked.calls = []
    state.requests = {}
    state.networks = {}
    state.tokens = {}
    state.sites = {}
  })

  it("reports the accounts a connection grants and where the dapp lives", async () => {
    state.requests["auth.1"] = { url: DAPP_URL, request: { provider: "ethereum" } }

    await handle("pri(sites.requests.approve)", { id: "auth.1", addresses: ["0x1", "0x2"] })

    expect(tracked.calls).toEqual([
      [
        "dapp_connection_approved",
        {
          method: "connect",
          platform: "ethereum",
          account_count: 2,
          dapp_domain: "app.example.com",
        },
      ],
    ])
  })

  it("reports a Solana sign-in as a connection of one account", async () => {
    state.requests["auth-sol-signIn.1"] = { url: DAPP_URL }

    await handle("pri(sites.requests.approveSolSignIn)", { id: "auth-sol-signIn.1", result: {} })

    expect(tracked.calls).toEqual([
      [
        "dapp_connection_approved",
        { method: "signIn", platform: "solana", account_count: 1, dapp_domain: "app.example.com" },
      ],
    ])
  })

  it("tells an account change from a network switch on a connected site", async () => {
    state.sites["app.example.com"] = { url: DAPP_URL }
    state.networks["1"] = { id: "1" }

    await handle("pri(sites.update)", {
      id: "app.example.com",
      authorisedSite: { ethAddresses: [] },
    })
    await handle("pri(sites.update)", { id: "app.example.com", authorisedSite: { ethChainId: 1 } })

    expect(tracked.calls).toEqual([
      [
        "dapp_connection_updated",
        { platform: "ethereum", account_count: 0, dapp_domain: "app.example.com" },
      ],
      ["dapp_network_switched", { network_id: "1", dapp_domain: "app.example.com" }],
    ])
  })

  it("reports a site forgotten in settings by its hostname, read before the handler deletes it", async () => {
    state.sites["app.example.com"] = { url: DAPP_URL, ethAddresses: ["0x1"] }

    await handle("pri(sites.forget)", { id: "app.example.com", type: "ethereum" }, () => {
      delete state.sites["app.example.com"]
    })

    expect(tracked.calls).toEqual([
      ["dapp_connection_forgotten", { platform: "ethereum", dapp_domain: "app.example.com" }],
    ])
  })

  it("counts the sites of the platform a forget all or disconnect all applies to", async () => {
    state.sites = {
      "a.example.com": { url: "https://a.example.com", ethAddresses: [] },
      "b.example.com": { url: "https://b.example.com", ethAddresses: ["0x1"], addresses: [] },
      "c.example.com": { url: "https://c.example.com", addresses: ["5Gr"] },
    }

    await handle("pri(sites.disconnect.all)", { type: "ethereum" })
    await handle("pri(sites.forget.all)", { type: "polkadot" }, () => {
      state.sites = {}
    })

    expect(tracked.calls).toEqual([
      ["dapp_connections_disconnected", { platform: "ethereum", site_count: 2 }],
      ["dapp_connections_forgotten", { platform: "polkadot", site_count: 2 }],
    ])
    for (const [event, props = {}] of tracked.calls)
      expect(catalogue[event].schema.safeParse(props).success, event).toBe(true)
  })

  it("reports a network a dapp adds as custom, with its RPC provider and never its URL", async () => {
    state.requests["eth-network-add.1"] = { url: DAPP_URL, network }

    await handle("pri(eth.networks.add.approve)", { id: "eth-network-add.1" }, () => {
      state.networks[CHAIN_ID] = { ...network, __isCustom: true }
    })

    expect(tracked.calls).toEqual([
      [
        "custom_network_saved",
        {
          mode: "add",
          platform: "ethereum",
          network_id: CHAIN_ID,
          testnet: false,
          rpc_provider: "alchemy.com",
          source: "dapp",
        },
      ],
    ])
  })

  it("reports a listed network a dapp turns on as a toggle", async () => {
    state.requests["eth-network-add.1"] = { url: DAPP_URL, network }
    state.networks[CHAIN_ID] = { ...network, isDefault: true }

    await handle("pri(eth.networks.add.approve)", { id: "eth-network-add.1" })

    expect(tracked.calls).toEqual([
      [
        "network_toggled",
        {
          network_id: CHAIN_ID,
          platform: "ethereum",
          enabled: true,
          default_enabled: true,
          source: "dapp",
        },
      ],
    ])
  })

  it("reports a token a dapp adds by symbol and network, never by its contract", async () => {
    const token = { id: TOKEN_ID, networkId: CHAIN_ID, symbol: "USDC", coingeckoId: "usd-coin" }
    state.requests["eth-watchasset.1"] = { url: DAPP_URL, token }
    state.networks[CHAIN_ID] = network

    await handle("pri(eth.watchasset.requests.approve)", { id: "eth-watchasset.1" }, () => {
      state.tokens[TOKEN_ID] = token
    })
    state.requests["eth-watchasset.2"] = { url: DAPP_URL, token }
    await handle("pri(eth.watchasset.requests.approve)", { id: "eth-watchasset.2" })

    expect(tracked.calls).toEqual([
      [
        "custom_token_added",
        { network_id: CHAIN_ID, token_symbol: "USDC", has_coingecko_id: true, source: "dapp" },
      ],
      [
        "token_toggled",
        {
          network_id: CHAIN_ID,
          token_symbol: "USDC",
          enabled: true,
          default_enabled: false,
          source: "dapp",
        },
      ],
    ])
    for (const [event, props = {}] of tracked.calls)
      expect(catalogue[event].schema.safeParse(props).success, event).toBe(true)
  })
})
