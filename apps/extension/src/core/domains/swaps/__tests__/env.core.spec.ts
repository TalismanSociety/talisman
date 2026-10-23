import { blake2b256 } from "@talismn/crypto"
import { hexToU8a, u8aToHex } from "@talismn/util"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { send, decodersBuilt, getMetadataDef } = vi.hoisted(() => ({
  send: vi.fn(),
  decodersBuilt: [] as string[],
  getMetadataDef: vi.fn(),
}))

vi.mock("@core/rpcs/chain-connector-dot", () => ({ chainConnectorDot: { send } }))
vi.mock("@core/rpcs/chain-connector-evm", () => ({ chainConnectorEvm: {} }))
vi.mock("@core/rpcs/chaindata", () => ({
  chaindataProvider: {
    getNetworkById: async () => ({ id: "bittensor", genesisHash: GENESIS_HASH }),
  },
}))
vi.mock("@core/domains/metadata/getMetadataDef", () => ({ getMetadataDef }))
vi.mock("@core/domains/metadata/helpers", () => ({
  getMetadataRpcFromDef: (def?: { metadataRpc: string }) => def?.metadataRpc,
}))
vi.mock("@core/domains/transactions/extrinsicEvents", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@core/domains/transactions/extrinsicEvents")>()),
  buildSystemEventsDecoder: (metadataRpc: string) => {
    decodersBuilt.push(metadataRpc)
    return () => [
      {
        phase: { type: "ApplyExtrinsic", value: 0 },
        event: { type: "System", value: { type: "ExtrinsicSuccess" } },
      },
    ]
  },
}))

const GENESIS_HASH = `0x${"99".repeat(32)}`
const V1_PARENT = `0x${"01".repeat(32)}` as const
const V1_BLOCK = `0x${"11".repeat(32)}` as const
const UPGRADE_BLOCK = `0x${"12".repeat(32)}` as const
const V2_BLOCK = `0x${"22".repeat(32)}` as const
const OURS = "0x280403000b90f7a1b09a01" as const
const OTHER = "0x280403000b90f7a1b09a02" as const
const EXTRINSIC = u8aToHex(blake2b256(hexToU8a(OURS)))
const V1_METADATA = "0x6d657461v1"
const V2_METADATA = "0x6d657461v2"

const PARENT_OF: Record<string, string> = {
  [V1_BLOCK]: V1_PARENT,
  [UPGRADE_BLOCK]: V1_PARENT,
  [V2_BLOCK]: UPGRADE_BLOCK,
}

const nodeWith = (extrinsics: string[]) =>
  send.mockImplementation(async (_chainId: string, method: string, params: unknown[]) => {
    const [at] = params
    if (method === "chain_getBlock")
      return {
        block: { header: { number: "0x69", parentHash: PARENT_OF[at as string] }, extrinsics },
      }
    if (method === "state_queryStorageAt") return [{ changes: [["0x", "0x00"]] }]
    if (method === "state_getRuntimeVersion") return { specVersion: at === V1_PARENT ? 1 : 2 }
    if (method === "state_getMetadata" && at === V1_PARENT) return V1_METADATA
    throw new Error(`unexpected ${method}`)
  })

const callsOf = (method: string) =>
  send.mock.calls.filter(([, called]) => called === method).map(([, , params]) => params)

const freshEnv = async () => (await import("../env.core")).coreSwapEnv

describe("coreSwapEnv decodeExtrinsicEvents", () => {
  beforeEach(() => {
    vi.resetModules()
    send.mockReset()
    decodersBuilt.length = 0
    getMetadataDef.mockReset().mockResolvedValue({ specVersion: 2, metadataRpc: V2_METADATA })
  })

  it("decodes a block with the metadata of the runtime that executed it", async () => {
    const env = await freshEnv()
    nodeWith([OURS])

    await env.decodeExtrinsicEvents("bittensor", V1_BLOCK, EXTRINSIC)
    await env.decodeExtrinsicEvents("bittensor", V2_BLOCK, EXTRINSIC)
    await env.decodeExtrinsicEvents("bittensor", V1_BLOCK, EXTRINSIC)

    expect(decodersBuilt).toEqual([V1_METADATA, V2_METADATA])
  })

  it("decodes the block that installs a runtime with the runtime it replaced", async () => {
    const env = await freshEnv()
    nodeWith([OURS])

    expect(await env.decodeExtrinsicEvents("bittensor", UPGRADE_BLOCK, EXTRINSIC)).toMatchObject({
      success: true,
    })

    expect(decodersBuilt).toEqual([V1_METADATA])
    expect(callsOf("state_getRuntimeVersion")).toEqual([[V1_PARENT]])
    expect(callsOf("state_queryStorageAt")).toEqual([[expect.any(Array), UPGRADE_BLOCK]])
  })

  it("proves the extrinsic absent from the block body alone", async () => {
    const env = await freshEnv()
    nodeWith([OTHER])
    getMetadataDef.mockRejectedValue(new Error("pruned"))

    expect(await env.decodeExtrinsicEvents("bittensor", V1_BLOCK, EXTRINSIC)).toBeNull()

    expect(callsOf("state_getRuntimeVersion")).toEqual([])
    expect(callsOf("state_getMetadata")).toEqual([])
    expect(decodersBuilt).toEqual([])
  })
})
