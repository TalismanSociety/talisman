import { TypeRegistry } from "@polkadot/types"
import { Hash } from "@polkadot/types/interfaces"
import { assert } from "@polkadot/util"
import { xxhashAsHex } from "@polkadot/util-crypto"
import { HexString } from "@polkadot/util/types"
import { SignerPayloadJSON } from "@substrate/txwrapper-core"
import { log } from "extension-shared"
import { Err, Ok, Result } from "ts-results"

import { sentry } from "../../config/sentry"
import { NotificationType, createNotification } from "../../notifications"
import { chainConnector } from "../../rpcs/chain-connector"
import { settingsStore } from "../app/store.settings"
import { Chain, ChainId } from "../chains/types"
import {
  addSubstrateTransaction,
  getExtrinsicHash,
  getTransactionStatus,
  updateTransactionStatus,
} from "./helpers"
import { WatchTransactionOptions } from "./types"

const TX_WATCH_TIMEOUT = 90_000 // 90 seconds in milliseconds

type ExtrinsicResult = {
  result: "error" | "success"
  blockNumber: number
  extIndex: number
}

type ExtrinsicStatusChangeHandler = (
  eventType: "included" | "error" | "success",
  blockNumber: number,
  extIndex: number
) => void

const getStorageKeyHash = (...names: string[]) => {
  return `0x${names.map((name) => xxhashAsHex(name, 128).slice(2)).join("")}`
}

const getExtrinsincResult = async (
  registry: TypeRegistry,
  blockHash: Hash,
  chainId: ChainId,
  extrinsicHash: string
): Promise<Result<ExtrinsicResult, "Unable to get result">> => {
  try {
    const blockData = await chainConnector.send(chainId, "chain_getBlock", [blockHash])
    const block = registry.createType("SignedBlock", blockData)

    const eventsStorageKey = getStorageKeyHash("System", "Events")
    const response = await chainConnector.send(chainId, "state_queryStorageAt", [
      [eventsStorageKey],
      blockHash,
    ])

    const eventsFrame = response[0]?.changes[0][1] || []

    const events = (() => {
      try {
        return registry.createType("Vec<FrameSystemEventRecord>", eventsFrame)
      } catch (error) {
        log.warn(
          "Failed to decode events as `FrameSystemEventRecord`, trying again as just `EventRecord` for old (pre metadata v14) chains"
        )
        return registry.createType("Vec<EventRecord>", eventsFrame)
      }
    })()

    for (const [txIndex, x] of block.block.extrinsics.entries()) {
      if (x.hash.eq(extrinsicHash)) {
        const relevantEvent = events.find(
          ({ phase, event }) =>
            phase.isApplyExtrinsic &&
            phase.asApplyExtrinsic.eqn(txIndex) &&
            ["ExtrinsicSuccess", "ExtrinsicFailed"].includes(event.method)
        )
        if (relevantEvent)
          if (relevantEvent?.event.method === "ExtrinsicSuccess") {
            // we don't need associated data (whether if a fee has been paid or not, and extrinsic weight)
            // const info = relevantEvent?.event.data[0] as DispatchInfo
            return Ok({
              result: "success",
              blockNumber: block.block.header.number.toNumber(),
              extIndex: txIndex,
            })
          } else if (relevantEvent?.event.method === "ExtrinsicFailed") {
            // from our tests this DispatchError object doesn't provide any relevant information for a user
            // const error = relevantEvent?.event.data[0] as DispatchError
            // const info = relevantEvent?.event.data[1] as DispatchInfo
            return Ok({
              result: "error",
              blockNumber: block.block.header.number.toNumber(),
              extIndex: txIndex,
            })
          }
      }
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
  chainId: ChainId,
  registry: TypeRegistry,
  extrinsicHash: string,
  cb: ExtrinsicStatusChangeHandler
) => {
  let foundInBlockHash: Hash
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
  const unsubscribeFinalizeHeads = await chainConnector.subscribe(
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
        const { hash: blockHash } = registry.createType("Header", data)
        const { val: extResult, err } = await getExtrinsincResult(
          registry,
          blockHash,
          chainId,
          extrinsicHash
        )

        if (err) return // err is true if extrinsic is not found in this block

        const { result, blockNumber, extIndex } = extResult
        cb(result, blockNumber, extIndex)

        await unsubscribe("finalizedHeads", () =>
          unsubscribeFinalizeHeads("chain_subscribeFinalizedHeads")
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
        const { hash: blockHash } = registry.createType("Header", data)
        const { val: extResult, err } = await getExtrinsincResult(
          registry,
          blockHash,
          chainId,
          extrinsicHash
        )

        if (err) return // err is true if extrinsic is not found in this block

        const { result, blockNumber, extIndex } = extResult
        if (result === "success") {
          foundInBlockHash = blockHash
          cb("included", blockNumber, extIndex)
        } else cb(result, blockNumber, extIndex)

        await unsubscribe("allHeads", () => unsubscribeAllHeads("chain_subscribeAllHeads"))

        // if error, no need to wait for a confirmation
        if (result === "error") {
          await unsubscribe("finalizedHeads", () =>
            unsubscribeFinalizeHeads("chain_subscribeFinalizedHeads")
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
    await unsubscribe("allHeads", () => unsubscribeAllHeads("chain_subscribeAllHeads"))
    if (subscriptions.finalizedHeads) {
      await unsubscribe("finalizedHeads", () =>
        unsubscribeFinalizeHeads("chain_subscribeFinalizedHeads")
      )
      // sometimes the finalized is not received, better check explicitely here
      if (foundInBlockHash) {
        const { val: extResult, err } = await getExtrinsincResult(
          registry,
          foundInBlockHash,
          chainId,
          extrinsicHash
        )
        if (!err) {
          const { result, blockNumber, extIndex } = extResult
          cb(result, blockNumber, extIndex)
        }
      }
    }

    //if still pending after subscription timeout, mark as unknown
    const status = await getTransactionStatus(extrinsicHash)
    if (status === "pending") await updateTransactionStatus(extrinsicHash, "unknown")
  }, TX_WATCH_TIMEOUT)
}

export const watchSubstrateTransaction = async (
  chain: Chain,
  registry: TypeRegistry,
  payload: SignerPayloadJSON,
  signature: HexString,
  options: WatchTransactionOptions = {}
) => {
  const { siteUrl, notifications, transferInfo = {} } = options
  const withNotifications = !!(notifications && (await settingsStore.get("allowNotifications")))

  assert(chain.genesisHash === payload.genesisHash, "Genesis hash mismatch")

  const hash = getExtrinsicHash(registry, payload, signature)

  await addSubstrateTransaction(hash, payload, { siteUrl, ...transferInfo })

  await watchExtrinsicStatus(chain.id, registry, hash, async (result, blockNumber, extIndex) => {
    const type: NotificationType = result === "included" ? "submitted" : result
    const url = `${chain.subscanUrl}extrinsic/${blockNumber}-${extIndex}`

    if (withNotifications) createNotification(type, chain.name ?? "chain", url)

    if (result !== "included") await updateTransactionStatus(hash, result, blockNumber)
  }).catch((err) => {
    // eslint-disable-next-line no-console
    console.warn("Failed to watch extrinsic", { err })
    sentry.captureException(err, { extra: { chainId: chain.id, chainName: chain.name } })
  })

  return hash
}
