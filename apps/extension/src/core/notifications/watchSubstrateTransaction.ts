import RpcFactory from "@core/libs/RpcFactory"
import { Chain, ChainId } from "@core/types"
import { getTypeRegistry } from "@core/util/getTypeRegistry"
import { EventRecord, Hash } from "@polkadot/types/interfaces"
import { xxhashAsHex } from "@polkadot/util-crypto"
import { createNotification, NotificationType } from "./createNotification"
import * as Sentry from "@sentry/browser"
import { Vec } from "@polkadot/types-codec"

const TX_WATCH_TIMEOUT = 60000

type ExtrinsicResult =
  | { result: "unknown" }
  | {
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
): Promise<ExtrinsicResult> => {
  const registry = await getTypeRegistry(chainId, blockHash.toHex())
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
          return {
            result: "success",
            blockNumber: block.block.header.number.toNumber(),
            extIndex: txIndex,
          }
        } else if (relevantEvent?.event.method === "ExtrinsicFailed") {
          // from our tests this DispatchError object doesn't provide any relevant information for a user
          // const error = relevantEvent?.event.data[0] as DispatchError
          // const info = relevantEvent?.event.data[1] as DispatchInfo
          return {
            result: "error",
            blockNumber: block.block.header.number.toNumber(),
            extIndex: txIndex,
          }
        }
    }
  }

  return { result: "unknown" }
}

const watchExtrinsicStatus = async (
  chainId: ChainId,
  hexSignature: string,
  cb: ExtrinsicStatusChangeHandler
) => {
  // this registry is only used to deterlube block hashes, so we can't specify one here
  const registry = await getTypeRegistry(chainId)
  let blockHash: Hash

  const state = {
    subscribedFinalizedHeads: true,
    subscribedAllHeads: true,
  }
  // watch for finalized blocks, this is the source of truth for successfull transactions
  const unsubscribeFinalizeHeadsProm = RpcFactory.subscribe(
    chainId,
    "chain_subscribeFinalizedHeads",
    "chain_subscribeFinalizedHeads",
    "chain_finalizedHead",
    [],
    async (error, data) => {
      if (error) return

      try {
        const blockHead = registry.createType("Header", data)
        const extResult = await getExtrinsincResult(blockHead.hash, chainId, hexSignature)

        if (extResult.result === "unknown") return
        const { result, blockNumber, extIndex } = extResult
        cb(result, blockNumber, extIndex)

        if (state.subscribedAllHeads) {
          state.subscribedFinalizedHeads = false
          const unsubscribeFinalizeHeads = await unsubscribeFinalizeHeadsProm
          unsubscribeFinalizeHeads()
        }
      } catch (err) {
        Sentry.captureException(err)
      }
    }
  )

  // watch for new blocks, a successfull extrinsic here only means it's included in a block
  // => need to wait for block to be finalized before considering it a success
  const unsubscribeAllHeadsProm = RpcFactory.subscribe(
    chainId,
    "chain_subscribeAllHeads",
    "chain_subscribeAllHeads",
    "chain_allHead",
    [],
    async (error, data) => {
      if (error) return

      try {
        const blockHead = registry.createType("Header", data) // result as Header;
        const extResult = await getExtrinsincResult(blockHead.hash, chainId, hexSignature)

        if (extResult.result === "unknown") return

        const { result, blockNumber, extIndex } = extResult
        if (result === "success") {
          blockHash = blockHead.hash
          cb("included", blockNumber, extIndex)
        } else cb(result, blockNumber, extIndex)

        if (state.subscribedAllHeads) {
          state.subscribedAllHeads = false
          const unsubscribeAllHeads = await unsubscribeAllHeadsProm
          unsubscribeAllHeads()
        }

        // if error, no need to wait for a confirmation
        if (result === "error" && state.subscribedFinalizedHeads) {
          state.subscribedFinalizedHeads = false
          const unsubscribeFinalizeHeads = await unsubscribeFinalizeHeadsProm
          unsubscribeFinalizeHeads()
        }
      } catch (err) {
        Sentry.captureException(err)
      }
    }
  )

  // the transaction may never be submitted by the dapp, so we stop watching after {TX_WATCH_TIMEOUT}
  setTimeout(async () => {
    if (state.subscribedAllHeads) {
      state.subscribedAllHeads = false
      const unsubscribeAllHeads = await unsubscribeAllHeadsProm
      unsubscribeAllHeads()
    }
    if (state.subscribedFinalizedHeads) {
      state.subscribedFinalizedHeads = false
      const unsubscribeFinalizeHeads = await unsubscribeFinalizeHeadsProm
      unsubscribeFinalizeHeads()
      // sometimes the finalized is not received, better check explicitely here
      if (blockHash) {
        const extResult = await getExtrinsincResult(blockHash, chainId, hexSignature)
        if (extResult.result === "unknown") return
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
  })
}
