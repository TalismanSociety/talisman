import { log } from "@common/log"
import { compactNumber, Twox128 } from "@polkadot-api/substrate-bindings"
import {
  type DotNetwork,
  type DotNetworkId,
  getBlockExplorerUrls,
} from "@talismn/chaindata-provider"
import { blake2b256 } from "@talismn/crypto"
import { parseMetadataRpc } from "@talismn/scale"
import type { HexString } from "@talismn/util"
import { assert, hexToU8a, u8aConcat, u8aToHex } from "@talismn/util"
import { Err, Ok, type Result } from "ts-results"
import { sentry } from "../../config/sentry"
import { createNotification, type NotificationType } from "../../notifications"
import { chainConnector } from "../../rpcs/chain-connector"
import type { SignerPayloadJSON } from "../../types/pjsInterop"
import { getMetadataDef } from "../../util/getMetadataDef"
import { settingsStore } from "../app/store.settings"
import { getMetadataRpcFromDef } from "../metadata/helpers"
import { assembleSubstrateTransaction } from "../signing/signSubstratePayload"
import { addSubstrateTransaction, getTransactionStatus, updateTransactionStatus } from "./helpers"
import type { WatchTransactionOptions } from "./types"
import { watchSwapStatus } from "./watchSwapStatus"

const TX_WATCH_TIMEOUT = 90_000 // 90 seconds in milliseconds

type ExtrinsicResult = {
  result: "error" | "success"
  blockNumber: number
  extIndex: number
}

type ExtrinsicStatusChangeHandler = (
  eventType: "included" | "error" | "success",
  blockNumber: number,
  extIndex: number,
  finalized: boolean
) => void

/** shape of a header as returned by the chain_subscribe*Heads JSON-RPC subscriptions */
type JsonHeader = {
  parentHash: HexString
  number: HexString
  stateRoot: HexString
  extrinsicsRoot: HexString
  digest?: { logs?: HexString[] }
}

/** decoded System.Events record (papi dynamic-builder shape) */
type SystemEventRecord = {
  phase?: { type: string; value?: number }
  event?: { type: string; value?: { type: string } }
}

type DecodeSystemEvents = (scaleHex: HexString) => SystemEventRecord[]

const getStorageKeyHash = (...names: string[]) => {
  return `0x${names.map((name) => u8aToHex(Twox128(new TextEncoder().encode(name))).slice(2)).join("")}`
}

/**
 * computes a header's hash (blake2b-256 of its SCALE encoding) and number from its JSON-RPC form.
 * Some chains extend the standard header (e.g. Avail's data-availability extension): re-encoding
 * their JSON form with the standard layout yields a wrong hash, so ask the node instead.
 * Returns null when the hash can't be determined (e.g. the header is on a fork the node dropped).
 */
const getHeaderInfo = async (
  chainId: DotNetworkId,
  header: JsonHeader
): Promise<{ hash: HexString; blockNumber: number } | null> => {
  const blockNumber = parseInt(header.number, 16)
  const logs = header.digest?.logs ?? []
  const isStandardHeader = Object.keys(header).every((key) =>
    ["parentHash", "number", "stateRoot", "extrinsicsRoot", "digest"].includes(key)
  )
  if (isStandardHeader) {
    const encoded = u8aConcat(
      hexToU8a(header.parentHash),
      compactNumber.enc(blockNumber),
      hexToU8a(header.stateRoot),
      hexToU8a(header.extrinsicsRoot),
      compactNumber.enc(logs.length),
      ...logs.map((logItem) => hexToU8a(logItem))
    )
    return { hash: u8aToHex(blake2b256(encoded)), blockNumber }
  }
  // chain_getBlockHash returns the node's best-chain block at that height, which under
  // chain_subscribeAllHeads may be a different fork than the header we received: fetch that
  // block's header and make sure it is the same one before using the hash
  const hash = await chainConnector.send<HexString | null>(chainId, "chain_getBlockHash", [
    blockNumber,
  ])
  if (!hash) return null
  const check = await chainConnector.send<JsonHeader | null>(chainId, "chain_getHeader", [hash])
  if (
    !check ||
    check.parentHash !== header.parentHash ||
    check.stateRoot !== header.stateRoot ||
    check.extrinsicsRoot !== header.extrinsicsRoot
  )
    return null
  return { hash, blockNumber }
}

const getExtrinsincResult = async (
  decodeSystemEvents: DecodeSystemEvents,
  blockHash: HexString,
  chainId: DotNetworkId,
  extrinsicHash: string
): Promise<Result<ExtrinsicResult, "Unable to get result">> => {
  try {
    const blockData = await chainConnector.send<{
      block: { header: JsonHeader; extrinsics: HexString[] }
    }>(chainId, "chain_getBlock", [blockHash])

    const eventsStorageKey = getStorageKeyHash("System", "Events")
    const response = await chainConnector.send<{ changes: [string, HexString | null][] }[] | null>(
      chainId,
      "state_queryStorageAt",
      [[eventsStorageKey], blockHash]
    )

    const eventsFrame = response?.[0]?.changes[0][1]
    const events = eventsFrame ? decodeSystemEvents(eventsFrame) : []

    const blockNumber = parseInt(blockData.block.header.number, 16)

    for (const [txIndex, extrinsic] of blockData.block.extrinsics.entries()) {
      if (u8aToHex(blake2b256(hexToU8a(extrinsic))) !== extrinsicHash) continue

      const relevantEvent = events.find(
        (record) =>
          record.phase?.type === "ApplyExtrinsic" &&
          Number(record.phase.value) === txIndex &&
          record.event?.type === "System" &&
          ["ExtrinsicSuccess", "ExtrinsicFailed"].includes(record.event.value?.type ?? "")
      )
      if (relevantEvent)
        return Ok({
          result: relevantEvent.event?.value?.type === "ExtrinsicSuccess" ? "success" : "error",
          blockNumber,
          extIndex: txIndex,
        })
    }
  } catch (error) {
    // errors commonly arise here due to misconfigured metadata
    // this is difficult to debug and may not be solvable at our end, so we are no longer logging them to Sentry
    // eg https://sentry.io/share/issue/6762fac9d55e4df9be29a25f108f075e/
    log.error(error)
  }

  return Err("Unable to get result")
}

const watchExtrinsicStatus = async (
  chainId: DotNetworkId,
  decodeSystemEvents: DecodeSystemEvents,
  extrinsicHash: string,
  cb: ExtrinsicStatusChangeHandler
) => {
  let foundInBlockHash: HexString
  let timeout: NodeJS.Timeout | null = null

  // keep track of subscriptions state because it raises errors when calling unsubscribe multiple times
  const subscriptions = {
    finalizedHeads: true,
    allHeads: true,
  }

  const unsubscribe = async (
    key: "finalizedHeads" | "allHeads",
    unsubscribeHandler: () => void
  ) => {
    if (!subscriptions[key]) return
    subscriptions[key] = false
    unsubscribeHandler()
  }

  // watch for finalized blocks, this is the source of truth for successfull transactions
  const unsubscribeFinalizedHeads = await chainConnector.subscribe(
    chainId,
    "chain_subscribeFinalizedHeads",
    "chain_finalizedHead",
    [],
    async (error, data) => {
      if (error) {
        const err = new Error("Failed to watch extrinsic status (chain_subscribeFinalizedHeads)", {
          cause: error,
        })
        log.error(err)
        sentry.captureException(err, { extra: { chainId } })
        return
      }

      try {
        const headerInfo = await getHeaderInfo(chainId, data as JsonHeader)
        if (!headerInfo) return
        const { val: extResult, err } = await getExtrinsincResult(
          decodeSystemEvents,
          headerInfo.hash,
          chainId,
          extrinsicHash
        )

        if (err) return // err is true if extrinsic is not found in this block

        const { result, blockNumber, extIndex } = extResult
        cb(result, blockNumber, extIndex, true)

        await unsubscribe("finalizedHeads", () =>
          unsubscribeFinalizedHeads("chain_unsubscribeFinalizedHeads")
        )
        if (timeout !== null) clearTimeout(timeout)
      } catch (error) {
        sentry.captureException(error, { extra: { chainId } })
      }
    }
  )

  // watch for new blocks, a successfull extrinsic here only means it's included in a block
  // => need to wait for block to be finalized before considering it a success
  const unsubscribeAllHeads = await chainConnector.subscribe(
    chainId,
    "chain_subscribeAllHeads",
    "chain_allHead",
    [],
    async (error, data) => {
      if (error) {
        const err = new Error("Failed to watch extrinsic status (chain_subscribeAllHeads)", {
          cause: error,
        })
        log.error(err)
        sentry.captureException(err, { extra: { chainId } })
        return
      }

      try {
        const headerInfo = await getHeaderInfo(chainId, data as JsonHeader)
        if (!headerInfo) return
        const { val: extResult, err } = await getExtrinsincResult(
          decodeSystemEvents,
          headerInfo.hash,
          chainId,
          extrinsicHash
        )

        if (err) return // err is true if extrinsic is not found in this block

        const { result, blockNumber, extIndex } = extResult

        if (result === "success") foundInBlockHash = headerInfo.hash
        cb(result, blockNumber, extIndex, false)

        await unsubscribe("allHeads", () => unsubscribeAllHeads("chain_unsubscribeAllHeads"))

        // if error, no need to wait for a confirmation
        if (result === "error") {
          await unsubscribe("finalizedHeads", () =>
            unsubscribeFinalizedHeads("chain_unsubscribeFinalizedHeads")
          )
          if (timeout !== null) clearTimeout(timeout)
        }
      } catch (error) {
        sentry.captureException(error, { extra: { chainId } })
      }
    }
  )

  // the transaction may never be submitted by the dapp, so we stop watching after {TX_WATCH_TIMEOUT}
  timeout = setTimeout(async () => {
    await unsubscribe("allHeads", () => unsubscribeAllHeads("chain_unsubscribeAllHeads"))
    if (subscriptions.finalizedHeads) {
      await unsubscribe("finalizedHeads", () =>
        unsubscribeFinalizedHeads("chain_unsubscribeFinalizedHeads")
      )
      // sometimes the finalized is not received, better check explicitely here
      if (foundInBlockHash) {
        const { val: extResult, err } = await getExtrinsincResult(
          decodeSystemEvents,
          foundInBlockHash,
          chainId,
          extrinsicHash
        )
        if (!err) {
          const { result, blockNumber, extIndex } = extResult
          cb(result, blockNumber, extIndex, true)
        }
      }
    }

    //if still pending after subscription timeout, mark as unknown
    const status = await getTransactionStatus(extrinsicHash)
    if (status === "pending") await updateTransactionStatus(extrinsicHash, "unknown")
  }, TX_WATCH_TIMEOUT)
}

export const watchSubstrateTransaction = async (
  chain: DotNetwork,
  payload: SignerPayloadJSON,
  signature: HexString,
  options: WatchTransactionOptions = {}
) => {
  const { siteUrl, notifications, txInfo } = options
  const withNotifications = !!(notifications && (await settingsStore.get("allowNotifications")))

  assert(chain.genesisHash === payload.genesisHash, "Genesis hash mismatch")

  try {
    const metadataDef = await getMetadataDef(payload.genesisHash, parseInt(payload.specVersion, 16))
    const metadataRpc = getMetadataRpcFromDef(metadataDef)
    assert(metadataRpc, `Unable to find metadata for chain ${payload.genesisHash}`)

    const { builder } = parseMetadataRpc(metadataRpc)
    const eventsCodec = builder.buildStorage("System", "Events").value
    const decodeSystemEvents: DecodeSystemEvents = (scaleHex) =>
      eventsCodec.dec(scaleHex) as SystemEventRecord[]

    const { hash } = await assembleSubstrateTransaction(
      payload as Parameters<typeof assembleSubstrateTransaction>[0],
      signature
    )

    await addSubstrateTransaction(chain.id, hash, payload, { siteUrl, txInfo })

    await watchExtrinsicStatus(
      chain.id,
      decodeSystemEvents,
      hash,
      async (result, blockNumber, _extIndex, finalized) => {
        const type: NotificationType = result === "included" ? "submitted" : result

        const blockExplorerUrls = getBlockExplorerUrls(chain, { type: "transaction", id: hash })
        const txUrl = blockExplorerUrls[0] ?? chrome.runtime.getURL("dashboard.html#/tx-history")

        if (withNotifications) createNotification(type, chain.name ?? "chain", txUrl)

        if (result !== "included")
          await updateTransactionStatus(hash, result, blockNumber, finalized)

        // Start watching exchange status for swap transactions
        if (result === "success" && txInfo) watchSwapStatus(hash)
      }
    )

    return hash
  } catch (cause) {
    const error = new Error("Failed to watch extrinsic", { cause })
    // biome-ignore lint/suspicious/noConsole: legacy
    console.warn(error)
    sentry.captureException(error, { extra: { chainId: chain.id, chainName: chain.name } })
    return
  }
}
