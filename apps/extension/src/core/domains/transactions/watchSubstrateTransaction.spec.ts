import { readFileSync } from "node:fs"
import path from "node:path"
import { gunzipSync } from "node:zlib"

import { Blake2256, blockHeader } from "@polkadot-api/substrate-bindings"
import type { DotNetwork } from "@talismn/chaindata-provider"
import { parseMetadataRpc } from "@talismn/scale"
import { type HexString, u8aToHex } from "@talismn/util"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { db } from "../../db"
import { createNotification } from "../../notifications"
import { chainConnectorDot } from "../../rpcs/chain-connector-dot"
import type { SignerPayloadJSON } from "../../types/pjsInterop"
import { settingsStore } from "../app/store.settings"
import { encodeMetadataRpc } from "../metadata/helpers"
import { watchSubstrateTransaction } from "./watchSubstrateTransaction"
import { watchSwapStatus } from "./watchSwapStatus"

vi.mock("../../notifications", () => ({ createNotification: vi.fn() }))
vi.mock("./watchSwapStatus", () => ({ watchSwapStatus: vi.fn() }))

type ParityFixture = {
  name: string
  payload: SignerPayloadJSON
  signature: HexString
  signedTransaction: HexString
  hash: HexString
}

const fixturesDir = path.resolve(__dirname, "../../../../tests/fixtures")
const FIXTURE = (
  JSON.parse(
    readFileSync(path.join(fixturesDir, "pjs-signing-parity.json"), "utf8")
  ) as ParityFixture[]
).find((f) => f.name === "polkadot ed25519 mortal") as ParityFixture

const METADATA_HEX = u8aToHex(
  Uint8Array.from(
    gunzipSync(readFileSync(path.join(fixturesDir, "polkadot-metadata-v15.scale.gz")))
  )
)

const POLKADOT = {
  id: "polkadot",
  name: "Polkadot",
  genesisHash: FIXTURE.payload.genesisHash,
  blockExplorerUrls: ["https://polkadot.subscan.io/"],
} as unknown as DotNetwork

// Timestamp.set, the inherent every block starts with
const OTHER_EXTRINSIC = "0x280403000b90f7a1b09a01" as HexString
const TX_WATCH_TIMEOUT = 90_000
// DigestItem::PreRuntime(*b"BABE", [1, 2, 3, 4])
const BABE_PRE_RUNTIME_LOG = "0x06424142451001020304" as HexString

type EventOutcome = "ExtrinsicSuccess" | "ExtrinsicFailed"

const eventsCodec = parseMetadataRpc(METADATA_HEX).builder.buildStorage("System", "Events").value

const dispatchInfo = {
  weight: { ref_time: 0n, proof_size: 0n },
  class: { type: "Normal" },
  pays_fee: { type: "Yes" },
}

const systemEvent = (extrinsicIndex: number, outcome: EventOutcome) => ({
  phase: { type: "ApplyExtrinsic", value: extrinsicIndex },
  event: {
    type: "System",
    value:
      outcome === "ExtrinsicSuccess"
        ? { type: outcome, value: { dispatch_info: dispatchInfo } }
        : {
            type: outcome,
            value: { dispatch_error: { type: "BadOrigin" }, dispatch_info: dispatchInfo },
          },
  },
  topics: [],
})

type Block = {
  header: {
    parentHash: HexString
    number: HexString
    stateRoot: HexString
    extrinsicsRoot: HexString
    digest: { logs: HexString[] }
  }
  extrinsics: HexString[]
  events: HexString
}

const makeBlock = (number: number, extrinsics: HexString[], outcomes: EventOutcome[]): Block => ({
  header: {
    parentHash: `0x${number.toString(16).padStart(64, "0")}`,
    number: `0x${number.toString(16)}`,
    stateRoot: `0x${"11".repeat(32)}`,
    extrinsicsRoot: `0x${"22".repeat(32)}`,
    digest: { logs: [BABE_PRE_RUNTIME_LOG] },
  },
  extrinsics,
  events: u8aToHex(eventsCodec.enc(outcomes.map((outcome, i) => systemEvent(i, outcome)))),
})

const blockHash = ({ header }: Block) =>
  u8aToHex(
    Blake2256(
      blockHeader.enc({
        parentHash: header.parentHash,
        number: parseInt(header.number, 16),
        stateRoot: header.stateRoot,
        extrinsicRoot: header.extrinsicsRoot,
        digests: [{ type: "preRuntime", value: { engine: "BABE", payload: "0x01020304" } }],
      })
    )
  )

const withOurs = (number: number, outcome: EventOutcome) =>
  makeBlock(number, [OTHER_EXTRINSIC, FIXTURE.signedTransaction], ["ExtrinsicSuccess", outcome])

const fakeChain = () => {
  const blocks = new Map<string, Block>()
  const bestChain = new Map<number, { hash: HexString; header: Block["header"] }>()
  const heads: Record<string, Parameters<typeof chainConnectorDot.subscribe>[4]> = {}
  const unsubscribed: string[] = []

  vi.spyOn(chainConnectorDot, "subscribe").mockImplementation(
    async (_chainId, method, _response, _params, callback) => {
      heads[method] = callback
      return (unsubscribeMethod) => {
        unsubscribed.push(unsubscribeMethod)
      }
    }
  )
  vi.spyOn(chainConnectorDot, "send").mockImplementation(async (_chainId, method, params) => {
    const block = blocks.get(params.at(-1) as string)
    switch (method) {
      case "chain_getBlock":
        return block && { block: { header: block.header, extrinsics: block.extrinsics } }
      case "chain_getBlockHash":
        return bestChain.get(params[0] as number)?.hash ?? null
      case "chain_getHeader":
        return [...bestChain.values()].find(({ hash }) => hash === params[0])?.header ?? null
      case "state_queryStorageAt":
        return block && [{ changes: [["0x26aa394eea5630e07c48ae0c9558cef7", block.events]] }]
      default:
        throw new Error(`Unexpected ${method}`)
    }
  })

  const announce = async (method: string, block: Block) => {
    blocks.set(blockHash(block), block)
    await heads[method](null, block.header)
  }

  return {
    unsubscribed,
    /** a header whose JSON form the watcher cannot re-encode, like Avail's */
    newExtendedHead: async (block: Block, nodeBlock = block) => {
      const hash = `0x${"ee".repeat(32)}` as HexString
      blocks.set(hash, block)
      bestChain.set(parseInt(block.header.number, 16), { hash, header: nodeBlock.header })
      await heads.chain_subscribeAllHeads(null, { ...block.header, extension: {} })
    },
    newHead: (block: Block) => announce("chain_subscribeAllHeads", block),
    finalizedHead: (block: Block) => announce("chain_subscribeFinalizedHeads", block),
  }
}

const storedTx = () => db.transactionsV2.get(FIXTURE.hash)

// the watcher does not await its status callback
const expectStoredTx = (expected: Record<string, unknown>) =>
  vi.waitFor(async () => expect(await storedTx()).toMatchObject(expected))

describe("watchSubstrateTransaction", () => {
  beforeAll(async () => {
    await db.metadata.put({
      genesisHash: POLKADOT.genesisHash,
      chain: "Polkadot",
      icon: "",
      specVersion: parseInt(FIXTURE.payload.specVersion, 16),
      ss58Format: 0,
      tokenDecimals: 10,
      tokenSymbol: "DOT",
      types: {},
      metadataRpc: encodeMetadataRpc(METADATA_HEX) as HexString,
    })
  })

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] })
    await db.transactionsV2.clear()
    vi.spyOn(settingsStore, "get").mockResolvedValue(true as never)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it("records the signed extrinsic as pending", async () => {
    fakeChain()

    await expect(
      watchSubstrateTransaction(POLKADOT, FIXTURE.payload, FIXTURE.signature, {
        siteUrl: "https://app.example.com",
      })
    ).resolves.toBe(FIXTURE.hash)

    expect(await storedTx()).toMatchObject({
      hash: FIXTURE.hash,
      networkId: "polkadot",
      account: FIXTURE.payload.address,
      status: "pending",
      siteUrl: "https://app.example.com",
    })
  })

  it("marks the extrinsic successful when included, then confirmed when finalised", async () => {
    const chain = fakeChain()
    await watchSubstrateTransaction(POLKADOT, FIXTURE.payload, FIXTURE.signature, {
      notifications: true,
    })
    const block = withOurs(100, "ExtrinsicSuccess")

    await chain.newHead(block)

    await expectStoredTx({ status: "success", blockNumber: "100", confirmed: false })
    expect(chain.unsubscribed).toEqual(["chain_unsubscribeAllHeads"])

    await chain.finalizedHead(block)

    await expectStoredTx({ status: "success", confirmed: true })
    expect(chain.unsubscribed).toEqual([
      "chain_unsubscribeAllHeads",
      "chain_unsubscribeFinalizedHeads",
    ])
    expect(createNotification).toHaveBeenLastCalledWith(
      "success",
      "Polkadot",
      expect.stringContaining(FIXTURE.hash)
    )
  })

  it("marks a failed extrinsic without waiting for finality", async () => {
    const chain = fakeChain()
    await watchSubstrateTransaction(POLKADOT, FIXTURE.payload, FIXTURE.signature)

    await chain.newHead(withOurs(100, "ExtrinsicFailed"))

    await expectStoredTx({ status: "error", blockNumber: "100" })
    expect(chain.unsubscribed).toEqual([
      "chain_unsubscribeAllHeads",
      "chain_unsubscribeFinalizedHeads",
    ])
    expect(createNotification).not.toHaveBeenCalled()
  })

  it("ignores blocks without the extrinsic", async () => {
    const chain = fakeChain()
    await watchSubstrateTransaction(POLKADOT, FIXTURE.payload, FIXTURE.signature)

    await chain.newHead(makeBlock(100, [OTHER_EXTRINSIC], ["ExtrinsicSuccess"]))
    await chain.finalizedHead(makeBlock(100, [OTHER_EXTRINSIC], ["ExtrinsicSuccess"]))

    expect(await storedTx()).toMatchObject({ status: "pending" })
    expect(chain.unsubscribed).toEqual([])
  })

  it("reads the outcome of the extrinsic's own index, not of its neighbours", async () => {
    const chain = fakeChain()
    await watchSubstrateTransaction(POLKADOT, FIXTURE.payload, FIXTURE.signature)

    await chain.newHead(
      makeBlock(
        100,
        [OTHER_EXTRINSIC, FIXTURE.signedTransaction, OTHER_EXTRINSIC],
        ["ExtrinsicFailed", "ExtrinsicSuccess", "ExtrinsicFailed"]
      )
    )

    await expectStoredTx({ status: "success" })
  })

  it("asks the node for the hash of a header it cannot re-encode", async () => {
    const chain = fakeChain()
    await watchSubstrateTransaction(POLKADOT, FIXTURE.payload, FIXTURE.signature)

    await chain.newExtendedHead(withOurs(100, "ExtrinsicSuccess"))

    await expectStoredTx({ status: "success", blockNumber: "100" })
  })

  it("ignores a header the node no longer has on its best chain", async () => {
    const chain = fakeChain()
    await watchSubstrateTransaction(POLKADOT, FIXTURE.payload, FIXTURE.signature)
    const fork = withOurs(100, "ExtrinsicSuccess")
    const best = {
      ...fork,
      header: { ...fork.header, stateRoot: `0x${"33".repeat(32)}` as HexString },
    }

    await chain.newExtendedHead(fork, best)

    expect(await storedTx()).toMatchObject({ status: "pending" })
    expect(chain.unsubscribed).toEqual([])
  })

  it("starts watching the swap once a swap transaction succeeds", async () => {
    const chain = fakeChain()
    await watchSubstrateTransaction(POLKADOT, FIXTURE.payload, FIXTURE.signature, {
      txInfo: { type: "swap" } as never,
    })

    await chain.newHead(withOurs(100, "ExtrinsicSuccess"))

    await vi.waitFor(() => expect(watchSwapStatus).toHaveBeenCalledWith(FIXTURE.hash))
  })

  describe("after the watch timeout", () => {
    it("marks a never-included extrinsic as unknown", async () => {
      const chain = fakeChain()
      await watchSubstrateTransaction(POLKADOT, FIXTURE.payload, FIXTURE.signature)

      await vi.advanceTimersByTimeAsync(TX_WATCH_TIMEOUT)

      await expectStoredTx({ status: "unknown" })
      expect(chain.unsubscribed).toEqual([
        "chain_unsubscribeAllHeads",
        "chain_unsubscribeFinalizedHeads",
      ])
    })

    it("confirms an included extrinsic whose finalised head never arrived", async () => {
      const chain = fakeChain()
      await watchSubstrateTransaction(POLKADOT, FIXTURE.payload, FIXTURE.signature)
      await chain.newHead(withOurs(100, "ExtrinsicSuccess"))

      await vi.advanceTimersByTimeAsync(TX_WATCH_TIMEOUT)

      await expectStoredTx({ status: "success", confirmed: true })
    })
  })

  it("refuses a payload for another chain", async () => {
    fakeChain()

    await expect(
      watchSubstrateTransaction(
        { ...POLKADOT, genesisHash: `0x${"00".repeat(32)}` },
        FIXTURE.payload,
        FIXTURE.signature
      )
    ).rejects.toThrow("Genesis hash mismatch")
  })

  it("gives up without throwing on a chain without metadata", async () => {
    fakeChain()
    const genesisHash = `0x${"00".repeat(32)}` as HexString

    await expect(
      watchSubstrateTransaction(
        { ...POLKADOT, genesisHash },
        { ...FIXTURE.payload, genesisHash },
        FIXTURE.signature
      )
    ).resolves.toBeUndefined()
    expect(await db.transactionsV2.count()).toBe(0)
  })
})
