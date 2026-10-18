import { log } from "@common/log"
import { Twox128 } from "@polkadot-api/substrate-bindings"
import type { DotNetwork, DotNetworkId } from "@talismn/chaindata-provider"
import { encryptKemAead } from "@talismn/crypto"
import { mortal, toPjsHex } from "@talismn/sapi"
import {
  Binary,
  getConstantValueFromMetadata,
  type MetadataBuilder,
  mergeUint8,
  parseMetadataRpc,
} from "@talismn/scale"
import { type HexString, u8aToHex } from "@talismn/util"
import { chainConnectorDot } from "../../rpcs/chain-connector-dot"
import type { SignerPayloadJSON } from "../../types/pjsInterop"
import { getMetadataDef } from "../metadata/getMetadataDef"
import { getMetadataRpcFromDef } from "../metadata/helpers"
import { assembleSubstrateTransaction } from "../signing/signSubstratePayload"
import type { WalletTransactionInfo } from "../transactions/types"
import {
  getHeaderInfo,
  type JsonHeader,
  watchSubstrateTransaction,
} from "../transactions/watchSubstrateTransaction"
import { getMevShieldInnerPayload, isMevShieldWindowOpen, MEV_SHIELD_ERA_PERIOD } from "./helpers"
import type { MevShieldResponseSubmit, MevShieldWindow } from "./types"

export type ChainHead = {
  number: number
  hash: HexString
  parentHash: HexString
}

export type ObservedHead = ChainHead & { seenAt: number }

type SignedPayload = { payload: SignerPayloadJSON; signature: HexString }

export type MevShieldSigned = {
  inner: SignedPayload
  outer: SignedPayload
  txInfo?: WalletTransactionInfo
}

const NEXT_HEAD_TIMEOUT_MS = 60_000

// Bittensor's block time, for a runtime that does not expose Timestamp.MinimumPeriod
const FALLBACK_BLOCK_TIME_MS = 12_000

const parseBlockNumber = (header: JsonHeader) => {
  const number = Number.parseInt(header.number, 16)
  if (!Number.isFinite(number)) throw new Error("Invalid block header")
  return number
}

const toChainHead = async (chainId: DotNetworkId, header: JsonHeader): Promise<ChainHead> => {
  const info = await getHeaderInfo(chainId, header)
  if (!info) throw new Error("Unable to hash the block header")
  return { number: info.blockNumber, hash: info.hash, parentHash: header.parentHash }
}

const getBestHeader = async (chainId: DotNetworkId) => {
  const header = await chainConnectorDot.send<JsonHeader | null>(
    chainId,
    "chain_getHeader",
    [],
    false
  )
  if (!header) throw new Error("Best block header not found")
  return header
}

const getBestNumber = async (chainId: DotNetworkId) =>
  parseBlockNumber(await getBestHeader(chainId))

export const getBestHead = async (chainId: DotNetworkId) =>
  toChainHead(chainId, await getBestHeader(chainId))

export const waitForNextHead = (
  chainId: DotNetworkId,
  timeoutMs = NEXT_HEAD_TIMEOUT_MS
): Promise<ObservedHead> =>
  new Promise<ObservedHead>((resolve, reject) => {
    let settled = false
    let baselineNumber: number | null = null
    let unsubscribe: ((method: string) => void) | null = null

    const settle = (outcome: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      unsubscribe?.("chain_unsubscribeNewHeads")
      outcome()
    }
    const fail = (error: unknown) => settle(() => reject(error))

    const timeout = setTimeout(
      () => fail(new Error("Timed out waiting for the next block")),
      timeoutMs
    )

    // the subscription replays the current best head first: it may be newer than any head seen
    // before subscribing, but it was not seen as it arrived
    const onHeader = async (header: JsonHeader | null) => {
      if (!header) throw new Error("Invalid block header")
      const number = parseBlockNumber(header)
      if (baselineNumber === null) {
        baselineNumber = number
        return
      }
      if (number <= baselineNumber) return
      const seenAt = Date.now()
      const head = await toChainHead(chainId, header)
      settle(() => resolve({ ...head, seenAt }))
    }

    chainConnectorDot
      .subscribe(
        chainId,
        "chain_subscribeNewHeads",
        "chain_newHead",
        [],
        (error, header: JsonHeader | null) => {
          if (settled) return
          if (error) return fail(error)
          onHeader(header).catch(fail)
        }
      )
      .then((unsubscribeHandler) => {
        unsubscribe = unsubscribeHandler
        if (settled) unsubscribeHandler("chain_unsubscribeNewHeads")
      }, fail)
  })

const readStorageAt = (chainId: DotNetworkId, key: string, at: HexString) =>
  chainConnectorDot.send<HexString | null>(chainId, "state_getStorage", [key, at], false)

const readNextKey = async (
  chainId: DotNetworkId,
  builder: MetadataBuilder,
  at: HexString
): Promise<Uint8Array | null> => {
  const storage = builder.buildStorage("MevShield", "NextKey")
  const value = await readStorageAt(chainId, storage.keys.enc(), at)
  if (!value) return null
  const key = storage.value.dec(value) as HexString | Uint8Array
  return typeof key === "string" ? Binary.fromHex(key) : key
}

// Aura authors a block every two Timestamp.MinimumPeriod
const getBlockTimeMs = (metadata: Parameters<typeof getConstantValueFromMetadata>[0]) => {
  try {
    const minimumPeriod = Number(
      getConstantValueFromMetadata<bigint>(metadata, "Timestamp", "MinimumPeriod")
    )
    return minimumPeriod > 0 ? minimumPeriod * 2 : FALLBACK_BLOCK_TIME_MS
  } catch {
    return FALLBACK_BLOCK_TIME_MS
  }
}

export const createMevShieldSeal = async (
  chainId: DotNetworkId,
  payload: SignerPayloadJSON,
  innerSignature: HexString
) => {
  const metadataRpc = getMetadataRpcFromDef(
    await getMetadataDef(payload.genesisHash, Number.parseInt(payload.specVersion, 16))
  )
  if (!metadataRpc) throw new Error("Metadata RPC not found")
  const metadata = parseMetadataRpc(metadataRpc)
  const { builder } = metadata

  const { signedTransactionBytes } = await assembleSubstrateTransaction(
    getMevShieldInnerPayload(payload),
    innerSignature
  )

  // the outer wrapper is born at the parent of head N: N's state holds its hash, and the 8 block
  // era keeps the wrapper valid through N + 6, past the block that can decrypt it
  const sealAt = async (head: ChainHead): Promise<SignerPayloadJSON | null> => {
    const nextKey = await readNextKey(chainId, builder, head.hash)
    if (!nextKey) return null

    const ciphertext = await encryptKemAead(Twox128(nextKey), nextKey, signedTransactionBytes)
    const { codec, location } = builder.buildCall("MevShield", "submit_encrypted")
    const method = mergeUint8([new Uint8Array(location), codec.enc({ ciphertext })])
    const birthNumber = head.number - 1

    return {
      ...payload,
      method: Binary.toHex(method),
      era: u8aToHex(
        mortal({ period: MEV_SHIELD_ERA_PERIOD, phase: birthNumber % MEV_SHIELD_ERA_PERIOD })
      ),
      blockNumber: toPjsHex(birthNumber, 4),
      blockHash: head.parentHash,
    }
  }

  return { sealAt, blockTimeMs: getBlockTimeMs(metadata) }
}

const assembleMevShield = ({ inner, outer }: MevShieldSigned) =>
  Promise.all([
    assembleSubstrateTransaction(inner.payload, inner.signature),
    assembleSubstrateTransaction(outer.payload, outer.signature),
  ])

/** Sends the outer wrapper only: the author of N + 2 decrypts it and includes the inner one */
const sendMevShield = async (
  chain: DotNetwork,
  { inner, outer, txInfo }: MevShieldSigned,
  [innerTx, outerTx]: Awaited<ReturnType<typeof assembleMevShield>>
) => {
  await chainConnectorDot.send(chain.id, "author_submitExtrinsic", [outerTx.signedTransaction])

  // inclusion is at least a block away, so watching once the node accepted the wrapper misses nothing
  try {
    await watchSubstrateTransaction(chain, outer.payload, outer.signature)
    await watchSubstrateTransaction(chain, inner.payload, inner.signature, { txInfo })
  } catch (err) {
    log.error("[mev-shield] failed to watch the broadcast transactions", err)
  }

  return { hash: outerTx.hash, innerHash: innerTx.hash }
}

export const broadcastMevShield = async (chain: DotNetwork, signed: MevShieldSigned) =>
  sendMevShield(chain, signed, await assembleMevShield(signed))

export const broadcastMevShieldInWindow = async (
  chain: DotNetwork,
  signed: MevShieldSigned,
  shieldWindow: MevShieldWindow
): Promise<MevShieldResponseSubmit> => {
  const assembled = await assembleMevShield(signed)
  const bestNumber = await getBestNumber(chain.id)
  if (!isMevShieldWindowOpen(shieldWindow, bestNumber, Date.now())) return { status: "missed" }

  return { status: "submitted", ...(await sendMevShield(chain, signed, assembled)) }
}
