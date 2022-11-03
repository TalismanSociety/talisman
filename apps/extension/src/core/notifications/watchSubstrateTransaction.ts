import { Chain, ChainId } from "@core/domains/chains/types"
import RpcFactory from "@core/libs/RpcFactory"
import { log } from "@core/log"
import { getTypeRegistry } from "@core/util/getTypeRegistry"
import { Vec } from "@polkadot/types-codec"
import { EventRecord, Hash } from "@polkadot/types/interfaces"
import { xxhashAsHex } from "@polkadot/util-crypto"
import * as Sentry from "@sentry/browser"
import { Err, Ok, Result } from "ts-results"

import { NotificationType, createNotification } from "./createNotification"

const TX_WATCH_TIMEOUT = 90000

type ExtrinsicResult = {
  result: "error" | "success"
  blockNumber: string | number
  extIndex: number
}

type ExtrinsicStatusChangeHandler = (
  eventType: "included" | "error" | "success",
  blockNumber: string | number,
  extIndex: number
) => void

const getStorageKeyHash = (...names: string[]) => {
  return `0x${names.map((name) => xxhashAsHex(name, 128).slice(2)).join("")}`
}

const getExtrinsincResult = async (
  blockHash: Hash,
  chainId: ChainId,
  hexSignature: string
): Promise<Result<ExtrinsicResult, "Unable to get result">> => {
  try {
    const { registry } = await getTypeRegistry(chainId, blockHash.toHex())
    const blockData = await RpcFactory.send(chainId, "chain_getBlock", [blockHash])
    const block = registry.createType("SignedBlock", blockData)

    const eventsStorageKey = getStorageKeyHash("System", "Events")
    const eventsFrame = await RpcFactory.send(chainId, "state_queryStorageAt", [
      [eventsStorageKey],
      blockHash,
    ])

    const events = registry.createType<Vec<EventRecord>>(
      "Vec<FrameSystemEventRecord>",
      eventsFrame[0].changes[0][1]
    )

    for (const [txIndex, x] of block.block.extrinsics.entries()) {
      if (x.signature.eq(hexSignature)) {
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
  hexSignature: string,
  cb: ExtrinsicStatusChangeHandler
) => {
  // this registry is only used to deterlube block hashes, so we can't specify one here
  const { registry } = await getTypeRegistry(chainId)
  let blockHash: Hash

  // keep track of subscriptions state because it raises errors when calling unsubscribe multiple times
  const subscriptions = {
    finalizedHeads: true,
    allHeads: true,
  }
  const unsubscribe = async (
    key: "finalizedHeads" | "allHeads",
    unsubscribeHandler: () => Promise<void>
  ) => {
    if (!subscriptions[key]) return
    subscriptions[key] = false
    await unsubscribeHandler()
  }

  // watch for finalized blocks, this is the source of truth for successfull transactions
  const unsubscribeFinalizeHeads = await RpcFactory.subscribe(
    chainId,
    "chain_subscribeFinalizedHeads",
    "chain_subscribeFinalizedHeads",
    "chain_finalizedHead",
    [],
    async (error, data) => {
      if (error) {
        log.error(error)
        Sentry.captureException(error, { extra: { chainId } })
        return
      }

      try {
        const { hash } = registry.createType("Header", data)
        const { val: extResult, err } = await getExtrinsincResult(hash, chainId, hexSignature)

        if (err) return
        const { result, blockNumber, extIndex } = extResult
        cb(result, blockNumber, extIndex)

        await unsubscribe("finalizedHeads", unsubscribeFinalizeHeads)
      } catch (error) {
        Sentry.captureException(error, { extra: { chainId } })
      }
    }
  )

  // watch for new blocks, a successfull extrinsic here only means it's included in a block
  // => need to wait for block to be finalized before considering it a success
  const unsubscribeAllHeads = await RpcFactory.subscribe(
    chainId,
    "chain_subscribeAllHeads",
    "chain_subscribeAllHeads",
    "chain_allHead",
    [],
    async (error, data) => {
      if (error) {
        Sentry.captureException(error, { extra: { chainId } })
        return
      }

      try {
        const { hash } = registry.createType("Header", data)
        const { val: extResult, err } = await getExtrinsincResult(hash, chainId, hexSignature)

        if (err) return

        const { result, blockNumber, extIndex } = extResult
        if (result === "success") {
          blockHash = hash
          cb("included", blockNumber, extIndex)
        } else cb(result, blockNumber, extIndex)

        await unsubscribe("allHeads", unsubscribeAllHeads)

        // if error, no need to wait for a confirmation
        if (result === "error") await unsubscribe("finalizedHeads", unsubscribeFinalizeHeads)
      } catch (error) {
        Sentry.captureException(error, { extra: { chainId } })
      }
    }
  )

  // the transaction may never be submitted by the dapp, so we stop watching after {TX_WATCH_TIMEOUT}
  setTimeout(async () => {
    await unsubscribe("allHeads", unsubscribeAllHeads)
    if (subscriptions.finalizedHeads) {
      await unsubscribe("finalizedHeads", unsubscribeFinalizeHeads)
      // sometimes the finalized is not received, better check explicitely here
      if (blockHash) {
        const { val: extResult, err } = await getExtrinsincResult(blockHash, chainId, hexSignature)
        if (err) return
        const { result, blockNumber, extIndex } = extResult
        cb(result, blockNumber, extIndex)
      }
    }
  }, TX_WATCH_TIMEOUT)
}

export const watchSubstrateTransaction = (chain: Chain, hexSignature: string) => {
  watchExtrinsicStatus(chain.id, hexSignature, async (result, blockNumber, extIndex) => {
    const type: NotificationType = result === "included" ? "submitted" : result
    const url = `${chain.subscanUrl}extrinsic/${blockNumber}-${extIndex}`

    createNotification(type, chain.name ?? "chain", url)
  }).catch((error) => {
    Sentry.captureException(error, { extra: { chainId: chain.id, chainName: chain.name } })
  })
}
