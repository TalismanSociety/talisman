import { Twox128 } from "@polkadot-api/substrate-bindings"
import type { DotNetworkId } from "@talismn/chaindata-provider"
import { blake2b256 } from "@talismn/crypto"
import { parseMetadataRpc } from "@talismn/scale"
import { type HexString, hexToU8a, u8aToHex } from "@talismn/util"

import { chainConnectorDot } from "../../rpcs/chain-connector-dot"

/** decoded System.Events record (papi dynamic-builder shape) */
export type SystemEventRecord = {
  phase?: { type: string; value?: number }
  event?: { type: string; value?: { type: string; value?: unknown } }
}

export type DecodeSystemEvents = (scaleHex: HexString) => SystemEventRecord[]

/** a block executes with the runtime of its parent, so its events decode with that runtime */
export type ResolveEventsDecoder = (
  parentHash: HexString
) => DecodeSystemEvents | Promise<DecodeSystemEvents>

export const buildSystemEventsDecoder = (metadataRpc: HexString): DecodeSystemEvents => {
  const eventsCodec = parseMetadataRpc(metadataRpc).builder.buildStorage("System", "Events").value
  return (scaleHex) => eventsCodec.dec(scaleHex) as SystemEventRecord[]
}

export type ExtrinsicEventsInBlock = {
  blockNumber: number
  extrinsicIndex: number
  success: boolean
  /** the records this extrinsic emitted, the System outcome included */
  events: SystemEventRecord[]
}

const storageKeyHash = (...names: string[]) =>
  `0x${names.map((name) => u8aToHex(Twox128(new TextEncoder().encode(name))).slice(2)).join("")}`

const SYSTEM_EVENTS_KEY = storageKeyHash("System", "Events")

const OUTCOME_EVENTS = ["ExtrinsicSuccess", "ExtrinsicFailed"]

/**
 * Finds the extrinsic in the block and decodes the events it emitted. Null only when the block does
 * not hold it, which the body alone proves: the decoder is resolved only for a block that holds it,
 * and such a block without a readable System outcome rejects, so a caller retries.
 */
export const findExtrinsicEvents = async (
  chainId: DotNetworkId,
  resolveDecoder: ResolveEventsDecoder,
  blockHash: HexString,
  extrinsicHash: string
): Promise<ExtrinsicEventsInBlock | null> => {
  const blockData = await chainConnectorDot.send<{
    block: { header: { number: HexString; parentHash: HexString }; extrinsics: HexString[] }
  }>(chainId, "chain_getBlock", [blockHash])

  const extrinsicIndex = blockData.block.extrinsics.findIndex(
    (extrinsic) => u8aToHex(blake2b256(hexToU8a(extrinsic))) === extrinsicHash
  )
  if (extrinsicIndex === -1) return null

  const decodeSystemEvents = await resolveDecoder(blockData.block.header.parentHash)
  const response = await chainConnectorDot.send<{ changes: [string, HexString | null][] }[] | null>(
    chainId,
    "state_queryStorageAt",
    [[SYSTEM_EVENTS_KEY], blockHash]
  )
  const eventsFrame = response?.[0]?.changes[0]?.[1]
  if (!eventsFrame) throw new Error("The node returned no events for the block of the extrinsic")

  const events = decodeSystemEvents(eventsFrame).filter(
    (record) =>
      record.phase?.type === "ApplyExtrinsic" && Number(record.phase.value) === extrinsicIndex
  )
  const outcome = events.find(
    (record) =>
      record.event?.type === "System" && OUTCOME_EVENTS.includes(record.event.value?.type ?? "")
  )
  if (!outcome) throw new Error("The events of the block hold no outcome for the extrinsic")

  return {
    blockNumber: parseInt(blockData.block.header.number, 16),
    extrinsicIndex,
    success: outcome.event?.value?.type === "ExtrinsicSuccess",
    events,
  }
}
