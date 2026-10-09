import { IPFS_GATEWAY } from "@common/constants"
import type { Account } from "@talismn/keyring"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { PAH_HOLDER, PAH_HOLDER_RPC, PAH_METADATA_RPC } from "./__fixtures__/pahHolder"

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  getMetadataDef: vi.fn(),
  fetch: vi.fn(),
}))

vi.mock("../../rpcs/chain-connector-dot", () => ({ chainConnectorDot: { send: mocks.send } }))

vi.mock("../metadata/getMetadataDef", () => ({ getMetadataDef: mocks.getMetadataDef }))

vi.mock("../metadata/helpers", () => ({
  getMetadataRpcFromDef: (def?: { metadataRpc: string }) =>
    def?.metadataRpc === "pah" ? PAH_METADATA_RPC : undefined,
}))

vi.mock("../../rpcs/chaindata", () => ({
  chaindataProvider: {
    getNetworkById: async (networkId: string) =>
      networkId === "polkadot-asset-hub"
        ? {
            id: "polkadot-asset-hub",
            platform: "polkadot",
            genesisHash: "0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f",
            specVersion: 2_000_000,
            account: "*25519",
            prefix: 0,
            isDefault: true,
          }
        : null,
  },
}))

vi.mock("../chaindata/store.activeNetworks", () => ({
  activeNetworksStore: { get: async () => ({}) },
  isNetworkActive: () => true,
}))

vi.mock("../../db/blobs", () => {
  let stored: unknown = null
  return {
    getBlobStore: () => ({
      get: async () => stored,
      set: async (data: unknown) => {
        stored = data
      },
    }),
  }
})

vi.mock("../../libs/isWalletReady", () => ({ walletReady: Promise.resolve() }))

import { buildNftPalletStorages, getItemMetadataKey } from "./nftPalletStorage"

const loadFetcher = async () => {
  vi.resetModules()
  return (await import("./fetchDotAccountNfts")).fetchDotAccountNfts
}

const ACCOUNT: Account = {
  type: "watch-only",
  address: PAH_HOLDER,
  name: "Holder",
  createdAt: 0,
  isPortfolio: true,
}

const recordedValues = new Map<string, `0x${string}` | null>(PAH_HOLDER_RPC.storageAt.changes)
const absentKeys = new Set<string>()

const replayRpc = async (_networkId: string, method: string, params: unknown[]) => {
  if (method === "state_getKeysPaged") {
    const [prefix] = params
    if (prefix === PAH_HOLDER_RPC.nftsOwnedKeys.prefix) return PAH_HOLDER_RPC.nftsOwnedKeys.keys
    if (prefix === PAH_HOLDER_RPC.uniquesOwnedKeys.prefix)
      return PAH_HOLDER_RPC.uniquesOwnedKeys.keys
  }
  if (method === "state_queryStorageAt") {
    const [keys] = params
    if (!Array.isArray(keys)) throw new Error("state_queryStorageAt without keys")
    return [
      {
        block: PAH_HOLDER_RPC.storageAt.block,
        changes: keys.map((key) => {
          if (!recordedValues.has(key)) throw new Error(`Unrecorded storage key ${key}`)
          return [key, absentKeys.has(key) ? null : recordedValues.get(key)]
        }),
      },
    ]
  }
  throw new Error(`Unrecorded rpc call ${method} ${JSON.stringify(params)}`)
}

const CHAOTIC = "https://dyndata.chaotic.art/v1/metadata/ahp"
const JSON_BY_URL: Record<string, unknown> = {
  [`${CHAOTIC}/158/2407162256`]: {
    name: "Chaotic #2407162256",
    image: "ipfs://bafybeib7jdehssvmya63apsv77c72igkxeixrj4kvkoxcozgl4lyi2m5me/a.png",
  },
  [`${IPFS_GATEWAY}bafkreicgj674v7yqduga6angw3d4cvrlnfrgqp2grt53sq64gnpvodjepu`]: {
    name: "Chaotic 158",
  },
  [`${IPFS_GATEWAY}QmeVzDquTHoHdtvi8Cbtg9F7Leub3C2qDWC6hDCMfGmACM`]: { name: "Duo" },
  [`${IPFS_GATEWAY}QmbEpny6f536SsfgLqvNgBsGLSjPEG2R8LXF3TGcMoAdFq`]: { name: "Bare CID item" },
}
const NETWORK_ERROR_URL = `${CHAOTIC}/256/4235681442`

const respond = async (url: string) => {
  if (url === NETWORK_ERROR_URL) throw new TypeError("Failed to fetch")
  return url in JSON_BY_URL
    ? new Response(JSON.stringify(JSON_BY_URL[url]))
    : new Response("{}", { status: 404 })
}

const OWNED = [
  [158, 2407162256],
  [121, 2404145249],
  [256, 4235681442],
  [256, 4235681441],
  [108, 32],
  [99, 40],
  [77, 209],
  [127, 2405293873],
  [13, 313],
  [161, 2407259015],
  [87, 110],
  [112, 143],
  [115, 2404415748],
  [116, 69],
  [91, 66],
]

const countCalls = (method: string) =>
  mocks.send.mock.calls.filter(([, calledMethod]) => calledMethod === method).length

const queriedKeys = () =>
  mocks.send.mock.calls
    .filter(([, method]) => method === "state_queryStorageAt")
    .flatMap(([, , [keys]]) => keys as string[])

const CHAOTIC_ITEM_KEY = getItemMetadataKey(
  buildNftPalletStorages(PAH_METADATA_RPC).find((storage) => storage.pallet === "Nfts")!,
  { collection: 158, item: 2407162256 }
)

describe("fetchDotAccountNfts", () => {
  beforeEach(() => {
    mocks.send.mockReset()
    mocks.send.mockImplementation(replayRpc)
    mocks.fetch.mockReset()
    mocks.fetch.mockImplementation(respond)
    vi.stubGlobal("fetch", mocks.fetch)
    mocks.getMetadataDef.mockReset()
    mocks.getMetadataDef.mockResolvedValue({ metadataRpc: "pah" })
    absentKeys.clear()
  })

  it("reads the holder's NFTs from chain, then refreshes with key listings only", async () => {
    const fetchDotAccountNfts = await loadFetcher()
    const signal = new AbortController().signal
    const first = await fetchDotAccountNfts(ACCOUNT, signal)

    expect(first.nfts.map((nft) => nft.id).sort()).toEqual(
      OWNED.map(([c, i]) => `substrate:polkadot-asset-hub:Nfts:${c}:${i}`).sort()
    )
    expect(first.collections).toHaveLength(14)
    expect(first.nfts.every((nft) => nft.owner === PAH_HOLDER)).toBe(true)

    const byId = new Map(first.nfts.map((nft) => [nft.tokenId, nft]))
    expect(byId.get("2407162256")).toMatchObject({
      name: "Chaotic #2407162256",
      imageUrl: `${IPFS_GATEWAY}bafybeib7jdehssvmya63apsv77c72igkxeixrj4kvkoxcozgl4lyi2m5me/a.png`,
    })
    expect(byId.get("313")?.name).toBe("Bare CID item")
    expect(byId.get("2404145249")).toMatchObject({
      name: "Collection 121 #2404145249",
      imageUrl: null,
    })
    expect(byId.get("4235681442")?.name).toBe("Duo #4235681442")
    expect(first.collections.find((c) => c.name === "Chaotic 158")?.id).toBe(
      "substrate:polkadot-asset-hub:Nfts:158"
    )

    expect(countCalls("state_getKeysPaged")).toBe(2)
    expect(countCalls("state_queryStorageAt")).toBe(1)
    expect(mocks.send).toHaveBeenCalledTimes(3)
    expect(mocks.getMetadataDef).toHaveBeenCalledTimes(1)
    const fetchesAfterFirstRun = mocks.fetch.mock.calls.length
    expect(fetchesAfterFirstRun).toBe(15 + 14)

    const second = await fetchDotAccountNfts(ACCOUNT, signal)

    expect(second).toEqual(first)
    expect(countCalls("state_getKeysPaged")).toBe(4)
    expect(countCalls("state_queryStorageAt")).toBe(1)
    expect(mocks.send).toHaveBeenCalledTimes(5)
    expect(mocks.getMetadataDef).toHaveBeenCalledTimes(1)
    expect(mocks.fetch).toHaveBeenCalledTimes(fetchesAfterFirstRun)
  })

  it("re-reads metadata that was absent on chain until it appears", async () => {
    const fetchDotAccountNfts = await loadFetcher()
    const signal = new AbortController().signal
    absentKeys.add(CHAOTIC_ITEM_KEY)

    const first = await fetchDotAccountNfts(ACCOUNT, signal)
    expect(first.nfts.find((nft) => nft.tokenId === "2407162256")?.name).toBe(
      "Chaotic 158 #2407162256"
    )
    expect(countCalls("state_queryStorageAt")).toBe(1)

    absentKeys.clear()
    const second = await fetchDotAccountNfts(ACCOUNT, signal)
    expect(second.nfts.find((nft) => nft.tokenId === "2407162256")?.name).toBe(
      "Chaotic #2407162256"
    )
    expect(countCalls("state_queryStorageAt")).toBe(2)
    expect(queriedKeys().slice(29)).toEqual([CHAOTIC_ITEM_KEY])

    await fetchDotAccountNfts(ACCOUNT, signal)
    expect(countCalls("state_queryStorageAt")).toBe(2)
  })

  it("rejects the account when listing owned keys fails", async () => {
    const fetchDotAccountNfts = await loadFetcher()
    mocks.send.mockImplementation(async (networkId: string, method: string, params: unknown[]) => {
      if (method === "state_getKeysPaged") throw new Error("RPC unavailable")
      return replayRpc(networkId, method, params)
    })

    await expect(fetchDotAccountNfts(ACCOUNT, new AbortController().signal)).rejects.toThrow(
      "RPC unavailable"
    )
  })
})
