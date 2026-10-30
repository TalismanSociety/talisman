import { blake2b256 } from "@talismn/crypto"
import { type HexString, hexToU8a, u8aToHex } from "@talismn/util"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { chainConnectorDot } from "../../rpcs/chain-connector-dot"
import { findExtrinsicEvents, type SystemEventRecord } from "./extrinsicEvents"

vi.mock("../../rpcs/chain-connector-dot", () => ({ chainConnectorDot: { send: vi.fn() } }))

const OURS = "0x280403000b90f7a1b09a01" as HexString
const OTHER = "0x280403000b90f7a1b09a02" as HexString
const OURS_HASH = u8aToHex(blake2b256(hexToU8a(OURS)))
const BLOCK_HASH = `0x${"bb".repeat(32)}` as HexString
const EVENTS_FRAME = "0x00" as HexString

const outcomeOf = (extrinsicIndex: number): SystemEventRecord => ({
  phase: { type: "ApplyExtrinsic", value: extrinsicIndex },
  event: { type: "System", value: { type: "ExtrinsicSuccess" } },
})

const node = (extrinsics: HexString[], eventsFrame: HexString | null) =>
  vi.mocked(chainConnectorDot.send).mockImplementation((async (
    _chainId: string,
    method: string
  ) => {
    if (method === "chain_getBlock") return { block: { header: { number: "0x69" }, extrinsics } }
    if (method === "state_queryStorageAt") return [{ changes: [["0x", eventsFrame]] }]
    throw new Error(`unexpected ${method}`)
  }) as never)

describe("findExtrinsicEvents", () => {
  beforeEach(() => {
    vi.mocked(chainConnectorDot.send).mockReset()
  })

  it("finds the extrinsic's outcome and events", async () => {
    node([OTHER, OURS], EVENTS_FRAME)

    expect(
      await findExtrinsicEvents("bittensor", () => () => [outcomeOf(1)], BLOCK_HASH, OURS_HASH)
    ).toEqual({ blockNumber: 105, extrinsicIndex: 1, success: true, events: [outcomeOf(1)] })
  })

  it("is null when the block does not hold the extrinsic, without resolving a decoder", async () => {
    node([OTHER], EVENTS_FRAME)

    const noRuntime = () => {
      throw new Error("the node pruned the state of the block")
    }

    expect(await findExtrinsicEvents("bittensor", noRuntime, BLOCK_HASH, OURS_HASH)).toBeNull()
  })

  it("rejects when the block holds the extrinsic and the node returns no events", async () => {
    node([OTHER, OURS], null)

    await expect(
      findExtrinsicEvents("bittensor", () => () => [outcomeOf(1)], BLOCK_HASH, OURS_HASH)
    ).rejects.toThrow()
  })

  it("rejects when the block holds the extrinsic and its events hold no outcome", async () => {
    node([OTHER, OURS], EVENTS_FRAME)

    await expect(
      findExtrinsicEvents("bittensor", () => () => [outcomeOf(0)], BLOCK_HASH, OURS_HASH)
    ).rejects.toThrow()
  })
})
