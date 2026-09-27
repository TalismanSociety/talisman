import { toHex } from "@polkadot-api/utils"
import { describe, expect, it } from "vitest"

import { createRpcStub, getParityFixture, getTestScaleApi } from "../__fixtures__/chains"
import { getChainInfo } from "./getChainInfo"
import { getSignerPayloadJSON } from "./getSignerPayloadJSON"
import type { Chain } from "./types"

const SYSTEM_NUMBER_KEY = "0x26aa394eea5630e07c48ae0c9558cef702a5c1b19ab7a04f536c519aca4983ac"
const SYSTEM_BLOCK_HASH_PREFIX =
  "0x26aa394eea5630e07c48ae0c9558cef7a44704b568d21667356a5a050c118746"
const SYSTEM_BLOCK_HASH_0_KEY = `${SYSTEM_BLOCK_HASH_PREFIX}b4def25cfda6ef3a00000000`

const POLKADOT_GENESIS_HASH = "0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3"
const FINALIZED_HASH = "0xe1b1dda72998846487e4d858909d4f9a6bbd6e338e4588e5d809de16b1317b80"
const FALLBACK_HASH = "0x1111111111111111111111111111111111111111111111111111111111111111"

const reference = getParityFixture("polkadot ed25519 immortal").payload
const REMARK_ARGS = { remark: new TextEncoder().encode("talisman parity") }

const u32Hex = (value: number) => {
  const bytes = new Uint8Array(4)
  new DataView(bytes.buffer).setUint32(0, value, true)
  return toHex(bytes)
}

const blockNumberFromKey = (key: string) =>
  new DataView(Uint8Array.from(Buffer.from(key.slice(-8), "hex")).buffer).getUint32(0, true)

type Head = { finalized: number; current: number; fallbackHash?: string | null }

const createChainRpc = ({ finalized, current, fallbackHash = FALLBACK_HASH }: Head) =>
  createRpcStub((method, params) => {
    if (method === "chain_getFinalizedHead") return FINALIZED_HASH
    if (method === "system_accountNextIndex") return 5
    if (method !== "state_getStorage") throw new Error(`Unexpected rpc call: ${method}`)

    const [key, at] = params as [string, string | undefined]
    if (key === SYSTEM_BLOCK_HASH_0_KEY) return POLKADOT_GENESIS_HASH
    if (key === SYSTEM_NUMBER_KEY) return u32Hex(at === FINALIZED_HASH ? finalized : current)
    if (key.startsWith(SYSTEM_BLOCK_HASH_PREFIX)) return fallbackHash
    throw new Error(`Unexpected storage key: ${key}`)
  })

const buildRemark = (
  head: Head,
  { hasCheckMetadataHash = false, tip }: { hasCheckMetadataHash?: boolean; tip?: bigint } = {}
) => {
  const rpc = createChainRpc(head)
  const api = getTestScaleApi("polkadot", { send: rpc.send, hasCheckMetadataHash })
  const result = api.getExtrinsicPayload("System", "remark", REMARK_ARGS, {
    address: reference.address,
    tip,
  })
  return { result, calls: rpc.calls }
}

describe("getSignerPayloadJSON", () => {
  it("builds a payload mortal from the finalized block", async () => {
    const { result } = buildRemark({ finalized: 42, current: 50 })

    expect(await result).toEqual({
      payload: {
        address: reference.address,
        genesisHash: POLKADOT_GENESIS_HASH,
        blockHash: FINALIZED_HASH,
        method: reference.method,
        signedExtensions: reference.signedExtensions,
        nonce: reference.nonce,
        specVersion: reference.specVersion,
        transactionVersion: reference.transactionVersion,
        blockNumber: "0x0000002a",
        era: "0xa502",
        tip: reference.tip,
        assetId: undefined,
        version: 4,
      },
      txMetadata: undefined,
      shortMetadata: undefined,
    })
  })

  it("reads the finalized head, nonce, genesis hash and block numbers", async () => {
    const { result, calls } = buildRemark({ finalized: 42, current: 50 })
    await result

    expect(calls).toEqual([
      { method: "chain_getFinalizedHead", params: [], isCacheable: false },
      { method: "system_accountNextIndex", params: [reference.address], isCacheable: false },
      { method: "state_getStorage", params: [SYSTEM_BLOCK_HASH_0_KEY, undefined] },
      { method: "state_getStorage", params: [SYSTEM_NUMBER_KEY, FINALIZED_HASH] },
      { method: "state_getStorage", params: [SYSTEM_NUMBER_KEY, undefined] },
    ])
  })

  it("uses the block 16 below the best block when finality lags by more than 32 blocks", async () => {
    const { result, calls } = buildRemark({ finalized: 42, current: 100 })
    const { payload } = await result

    expect(payload.blockNumber).toBe("0x00000054")
    expect(payload.blockHash).toBe(FALLBACK_HASH)
    expect(payload.era).toBe("0x4501")
    const fallbackKey = calls.at(-1)?.params[0] as string
    expect(fallbackKey.startsWith(SYSTEM_BLOCK_HASH_PREFIX)).toBe(true)
    expect(blockNumberFromKey(fallbackKey)).toBe(84)
  })

  it("keeps the finalized block when finality lags by exactly 32 blocks", async () => {
    const { payload } = await buildRemark({ finalized: 42, current: 74 }).result

    expect(payload.blockNumber).toBe("0x0000002a")
    expect(payload.blockHash).toBe(FINALIZED_HASH)
  })

  it("does not validate the block hash of the lagging-finality fallback", async () => {
    const { payload } = await buildRemark({ finalized: 42, current: 100, fallbackHash: null })
      .result

    expect(payload.blockHash).toBeNull()
  })

  it("ignores the tip of the signer config", async () => {
    const { payload } = await buildRemark({ finalized: 42, current: 50 }, { tip: 1_000n }).result

    expect(payload.tip).toBe("0x00000000000000000000000000000000")
  })

  it("throws when the genesis hash is missing", async () => {
    const rpc = createRpcStub((method, params) => {
      if (method === "chain_getFinalizedHead") return FINALIZED_HASH
      if (method === "system_accountNextIndex") return 5
      return (params[0] as string) === SYSTEM_NUMBER_KEY ? u32Hex(42) : null
    })
    const api = getTestScaleApi("polkadot", { send: rpc.send })

    await expect(
      api.getExtrinsicPayload("System", "remark", REMARK_ARGS, { address: reference.address })
    ).rejects.toThrow("Genesis hash not found")
  })

  it("adds the metadata hash and short metadata on chains using CheckMetadataHash", async () => {
    const { payload, txMetadata, shortMetadata } = await buildRemark(
      { finalized: 42, current: 50 },
      { hasCheckMetadataHash: true }
    ).result

    expect(payload.mode).toBe(1)
    expect(payload.metadataHash).toBe(
      "0x06760163466bbdb79e6c57ef330875d17f36d0a005b0d956cc171d833df1980a"
    )
    expect(payload.withSignedTransaction).toBe(true)
    expect(txMetadata).toBeInstanceOf(Uint8Array)
    expect(shortMetadata).toBe(txMetadata && toHex(txMetadata))
  })

  it("defaults the Avail app id to 0", async () => {
    const rpc = createChainRpc({ finalized: 42, current: 50 })
    const { chain } = getTestScaleApi("polkadot", { send: rpc.send })
    const [checkAppId] = chain.metadata.extrinsic.signedExtensions[0] ?? []
    const availLike: Chain = {
      ...chain,
      metadata: {
        ...chain.metadata,
        extrinsic: {
          ...chain.metadata.extrinsic,
          signedExtensions: {
            0: [
              ...(chain.metadata.extrinsic.signedExtensions[0] ?? []),
              { ...checkAppId, identifier: "CheckAppId" },
            ],
          },
        },
      },
    }

    const { payload } = await getSignerPayloadJSON(
      availLike,
      "System",
      "remark",
      REMARK_ARGS,
      { address: reference.address },
      getChainInfo(chain)
    )

    expect(payload.signedExtensions.at(-1)).toBe("CheckAppId")
    expect(payload).toHaveProperty("appId", 0)
  })
})
