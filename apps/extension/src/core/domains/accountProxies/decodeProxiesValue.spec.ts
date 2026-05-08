import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  mockGetMetadataDef: vi.fn(),
  mockGetMetadataRpcFromDef: vi.fn(),
  mockParseMetadataRpc: vi.fn(),
  mockSend: vi.fn(),
  mockSetProxyPalletStatus: vi.fn(),
}))

vi.mock("@talismn/scale", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@talismn/scale")>()
  return {
    ...actual,
    parseMetadataRpc: mocks.mockParseMetadataRpc,
  }
})

vi.mock("../../rpcs/chain-connector", () => ({
  chainConnector: { send: mocks.mockSend },
}))

vi.mock("../../util/getMetadataDef", () => ({
  getMetadataDef: mocks.mockGetMetadataDef,
}))

vi.mock("../metadata/helpers", () => ({
  getMetadataRpcFromDef: mocks.mockGetMetadataRpcFromDef,
}))

vi.mock("./store.proxyPalletCache", () => ({
  setProxyPalletStatus: mocks.mockSetProxyPalletStatus,
}))

import type { DotNetwork } from "@talismn/chaindata-provider"

import { decodeProxiesValue, loadNetworkProxyDetails } from "./accountProxiesProvider"

const SS58_FORMAT = 42

describe("decodeProxiesValue", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns the runtime default when raw is null", () => {
    const fakeCodec = { value: { dec: () => [[], 0n] } }
    expect(decodeProxiesValue(null, fakeCodec, SS58_FORMAT)).toEqual({
      deposit: 0n,
      proxies: [],
    })
  })

  it("decodes a single Any proxy with delay 0", () => {
    const fakeCodec = {
      value: {
        dec: () => [[{ delegate: "0xdead", proxy_type: { tag: "Any" }, delay: 0 }], 1_002_005_000n],
      },
    }
    const out = decodeProxiesValue("0x00", fakeCodec, SS58_FORMAT)
    expect(out.deposit).toBe(1_002_005_000n)
    expect(out.proxies).toEqual([{ delegate: "0xdead", proxyType: "Any", delay: "0" }])
  })

  it("decodes multiple proxies with non-zero delay", () => {
    const fakeCodec = {
      value: {
        dec: () => [
          [
            { delegate: "0xaaaa", proxy_type: "Governance", delay: 600 },
            { delegate: "0xbbbb", proxy_type: { tag: "Staking" }, delay: 0n },
          ],
          5_000_000_000n,
        ],
      },
    }
    const out = decodeProxiesValue("0x00", fakeCodec, SS58_FORMAT)
    expect(out.proxies).toEqual([
      { delegate: "0xaaaa", proxyType: "Governance", delay: "600" },
      { delegate: "0xbbbb", proxyType: "Staking", delay: "0" },
    ])
    expect(out.deposit).toBe(5_000_000_000n)
  })

  it("falls back to camelCase proxy_type if snake_case is missing", () => {
    const fakeCodec = {
      value: {
        dec: () => [[{ delegate: "0xcc", proxyType: "NonTransfer", delay: 0 }], 0n],
      },
    }
    const out = decodeProxiesValue("0x00", fakeCodec, SS58_FORMAT)
    expect(out.proxies[0].proxyType).toBe("NonTransfer")
  })

  it("encodes a Uint8Array delegate to SS58 using the given prefix", () => {
    // Alice public key (32 bytes)
    const alicePubKey = new Uint8Array([
      0xd4, 0x35, 0x93, 0xc7, 0x15, 0xfd, 0xd3, 0x1c, 0x61, 0x14, 0x1a, 0xbd, 0x04, 0xa9, 0x9f,
      0xd6, 0x82, 0x2c, 0x85, 0x58, 0x85, 0x4c, 0xcd, 0xe3, 0x9a, 0x56, 0x84, 0xe7, 0xa5, 0x6d,
      0xa2, 0x7d,
    ])
    const fakeCodec = {
      value: { dec: () => [[{ delegate: alicePubKey, proxy_type: "Any", delay: 0 }], 0n] },
    }
    const out = decodeProxiesValue("0x00", fakeCodec, SS58_FORMAT)
    // Generic substrate (prefix 42) encoding for Alice
    expect(out.proxies[0].delegate).toBe("5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY")
  })

  it("encodes a FixedSizeBinary-like delegate (asBytes) to SS58", () => {
    const alicePubKey = new Uint8Array([
      0xd4, 0x35, 0x93, 0xc7, 0x15, 0xfd, 0xd3, 0x1c, 0x61, 0x14, 0x1a, 0xbd, 0x04, 0xa9, 0x9f,
      0xd6, 0x82, 0x2c, 0x85, 0x58, 0x85, 0x4c, 0xcd, 0xe3, 0x9a, 0x56, 0x84, 0xe7, 0xa5, 0x6d,
      0xa2, 0x7d,
    ])
    const binaryLike = { asBytes: () => alicePubKey, asText: () => "garbage" }
    const fakeCodec = {
      value: { dec: () => [[{ delegate: binaryLike, proxy_type: "Any", delay: 0 }], 0n] },
    }
    const out = decodeProxiesValue("0x00", fakeCodec, 0)
    // prefix 0 → Polkadot SS58 encoding for Alice
    expect(out.proxies[0].delegate).toBe("15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5")
  })

  it("encodes a 20-byte AccountId20 delegate as a checksummed Ethereum address", () => {
    const delegate = new Uint8Array([
      0x52, 0x90, 0x84, 0x00, 0x09, 0x85, 0x27, 0x88, 0x6e, 0x0f, 0x70, 0x30, 0x06, 0x98, 0x57,
      0xd2, 0xe4, 0x16, 0x9e, 0xe7,
    ])
    const fakeCodec = {
      value: { dec: () => [[{ delegate, proxy_type: "Any", delay: 0 }], 0n] },
    }

    const out = decodeProxiesValue("0x00", fakeCodec, SS58_FORMAT)

    expect(out.proxies[0].delegate).toBe("0x52908400098527886E0F7030069857D2E4169EE7")
  })
})

describe("loadNetworkProxyDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns an error when every requested delegator fails to decode", async () => {
    const storageCodec = {
      keys: { enc: vi.fn(() => "0xproxykey") },
      value: {
        dec: vi.fn(() => {
          throw new Error("decode failed")
        }),
      },
    }
    mocks.mockGetMetadataDef.mockResolvedValue({ metadata: true })
    mocks.mockGetMetadataRpcFromDef.mockReturnValue("0xmetadata")
    mocks.mockParseMetadataRpc.mockReturnValue({
      builder: { buildStorage: vi.fn(() => storageCodec) },
    })
    mocks.mockSend.mockResolvedValue([{ block: "0xblock", changes: [["0xproxykey", "0x00"]] }])

    const outcome = await loadNetworkProxyDetails(
      {
        network: {
          id: "moonbeam",
          rpcs: ["wss://moonbeam.example"],
          prefix: 1284,
          specVersion: 1,
        } as DotNetwork,
        delegators: [{ address: "0x52908400098527886E0F7030069857D2E4169EE7" }],
      },
      new AbortController().signal
    )

    expect(outcome.ok).toBe(false)
    if (!outcome.ok) {
      expect((outcome.error as Error).message).toBe(
        "Failed to decode proxy details for all requested delegators"
      )
    }
  })
})
