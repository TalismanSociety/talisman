import { catalogue, type EventName } from "@common/analytics/catalogue"
import type { EventProperties } from "@common/analytics/schema"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { MessageTypes } from "../../types"
import { observeChaindataMessage } from "./chaindataMessages"
import { observeNftMessage } from "./nftMessages"

type TrackedCall = [event: EventName, props?: EventProperties]

const tracked = vi.hoisted(() => ({ calls: [] as TrackedCall[] }))
vi.mock("./track", () => ({
  track: (...call: TrackedCall) => {
    tracked.calls.push(call)
  },
}))

const state = vi.hoisted(() => ({
  networks: {} as Record<string, unknown>,
  tokens: {} as Record<string, unknown>,
}))
vi.mock("../../rpcs/chaindata", () => ({
  chaindataProvider: {
    getNetworkById: async (id: string) => state.networks[id] ?? null,
    getTokenById: async (id: string) => state.tokens[id] ?? null,
  },
}))

const GENESIS = "0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3"
const TOKEN_ID = "8453:evm-erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"

const handle = async (type: MessageTypes, request: unknown, afterHandler?: () => void) => {
  const settle = observeChaindataMessage(type, request) ?? observeNftMessage(type, request)
  afterHandler?.()
  await settle?.()
}

const evmNetwork = {
  id: "8453",
  platform: "ethereum",
  isTestnet: false,
  rpcs: ["https://base.g.alchemy.com/v2/key"],
}
const dotNetwork = {
  id: GENESIS,
  platform: "polkadot",
  isTestnet: true,
  rpcs: ["ws://localhost:9944"],
}

describe("chaindata messages", () => {
  beforeEach(() => {
    tracked.calls = []
    state.networks = {}
    state.tokens = {}
  })

  it("tells an added network from an edited one by what chaindata held before the handler", async () => {
    await handle("pri(chaindata.networks.upsert)", { network: evmNetwork }, () => {
      state.networks[evmNetwork.id] = { ...evmNetwork, __isCustom: true }
    })
    await handle("pri(chaindata.networks.upsert)", { network: evmNetwork })

    expect(tracked.calls.map(([event, props]) => [event, props?.mode])).toEqual([
      ["custom_network_saved", "add"],
      ["custom_network_saved", "edit"],
    ])
    expect(tracked.calls[0][1]).toEqual({
      mode: "add",
      platform: "ethereum",
      network_id: "8453",
      testnet: false,
      rpc_provider: "alchemy.com",
      source: "settings",
    })
  })

  it("never reports a user-added network's genesis hash, but keeps a listed network's id", async () => {
    await handle("pri(chaindata.networks.upsert)", { network: dotNetwork })
    state.networks.polkadot = { id: "polkadot", platform: "polkadot", __isKnown: true }
    await handle("pri(chaindata.networks.upsert)", {
      network: { ...dotNetwork, id: "polkadot", isTestnet: false },
    })
    state.networks[GENESIS] = { ...dotNetwork, __isCustom: true }
    await handle("pri(chaindata.networks.remove)", { id: GENESIS })
    await handle("pri(chaindata.networks.remove)", { id: "polkadot" })

    expect(tracked.calls).toEqual([
      [
        "custom_network_saved",
        {
          mode: "add",
          platform: "polkadot",
          network_id: "custom",
          testnet: true,
          rpc_provider: null,
          source: "settings",
        },
      ],
      [
        "custom_network_saved",
        {
          mode: "edit",
          platform: "polkadot",
          network_id: "polkadot",
          testnet: false,
          rpc_provider: null,
          source: "settings",
        },
      ],
      ["custom_network_deleted", { network_id: "custom", platform: "polkadot" }],
      ["custom_network_deleted", { network_id: "polkadot", platform: "polkadot" }],
    ])
  })

  it("reports a token by symbol and network, an edit apart from an add, never its contract", async () => {
    state.networks["8453"] = evmNetwork
    const token = { id: TOKEN_ID, networkId: "8453", symbol: "USDC", coingeckoId: "usd-coin" }

    await handle("pri(chaindata.tokens.upsert)", token, () => {
      state.tokens[TOKEN_ID] = token
    })
    await handle("pri(chaindata.tokens.upsert)", { ...token, symbol: "USDC.e" })
    await handle("pri(chaindata.tokens.remove)", { id: TOKEN_ID })

    expect(tracked.calls).toEqual([
      [
        "custom_token_added",
        { network_id: "8453", token_symbol: "USDC", has_coingecko_id: true, source: "settings" },
      ],
      ["custom_token_edited", { network_id: "8453", token_symbol: "USDC.e" }],
      ["custom_token_deleted", { network_id: "8453" }],
    ])
    expect(JSON.stringify(tracked.calls)).not.toContain("0x8335")
  })

  it("reports NFT choices from the request", async () => {
    await handle("pri(nfts.collection.setHidden)", { id: "c", isHidden: true })
    await handle("pri(nfts.setFavorite)", { id: "n", isFavorite: false })
    await handle("pri(nfts.refreshMetadata)", { id: "n" })

    expect(tracked.calls).toEqual([
      ["nft_collection_hidden_toggled", { hidden: true }],
      ["nft_favourite_toggled", { favourite: false }],
      ["nft_metadata_refreshed"],
    ])
  })

  it("sends only events the catalogue accepts", async () => {
    state.networks["8453"] = evmNetwork
    await handle("pri(chaindata.networks.upsert)", { network: dotNetwork })
    await handle("pri(chaindata.tokens.upsert)", { id: TOKEN_ID, networkId: "8453", symbol: "X" })
    await handle("pri(nfts.setFavorite)", { id: "n", isFavorite: true })

    expect(tracked.calls).toHaveLength(3)
    for (const [event, props = {}] of tracked.calls)
      expect(catalogue[event].schema.safeParse(props).success, event).toBe(true)
  })

  it("observes nothing else", () => {
    expect(observeChaindataMessage("pri(chaindata.networks.subscribe)", null)).toBeNull()
    expect(observeNftMessage("pri(nfts.subscribe)", null)).toBeNull()
  })
})
