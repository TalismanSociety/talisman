import BlocksRpc from "../../domains/blocks/rpc"
import { ChainId } from "../../domains/chains/types"
import { log } from "../../log"
import { chainConnector } from "../../rpcs/chain-connector"
import { SubscriptionCallback, UnsubscribeFn } from "../../types"
import { getTypeRegistry } from "../../util/getTypeRegistry"
import { EventList } from "./types"

// System.Events is the state_storage key prefix for events
const systemHash = "26aa394eea5630e07c48ae0c9558cef7" // util_crypto.xxhashAsHex("System", 128);
const eventsHash = "80d41e5e16056765bc8461851072c9d7" // util_crypto.xxhashAsHex("Events", 128);
const systemEventsHash = `${systemHash}${eventsHash}`

export default class EventsRpc {
  /**
   * Fetch or subscribe to events by chainIds and block.
   *
   * @param chainId - The chain to query events from.
   * @param block - The block number or hash to query events for.
   * @param callback - Optional subscription callback.
   * @returns Either an `EventList`, or an unsubscribe function if the `callback` parameter was given.
   */
  static async events(chainId: ChainId, block?: string | number): Promise<EventList>
  static async events(
    chainId: ChainId,
    callback: SubscriptionCallback<EventList>
  ): Promise<UnsubscribeFn>
  static async events(
    chainId: ChainId,
    blockOrCallback?: string | number | SubscriptionCallback<EventList>
  ): Promise<EventList | UnsubscribeFn> {
    const isBlock = typeof blockOrCallback === "string" || typeof blockOrCallback === "number"
    const block = isBlock ? blockOrCallback : undefined
    const callback = !isBlock ? blockOrCallback : undefined

    // subscription request
    if (callback !== undefined) {
      // // subscribe to events
      // const unsubscribe = await this.subscribeEvents(chainId, callback)

      // // return unsub function
      // return unsubscribe

      throw new Error("Event subscriptions is not implemented!")
    }

    // once-off request
    return await this.fetchEvents(chainId, block)
  }

  /**
   * Fetch events from one chain by chainId and optional block.
   *
   * @param chainId - The chain to query events from.
   * @param block - The block number or hash to query events for.
   * @returns The fetched events as an `EventList`.
   */
  private static async fetchEvents(chainId: ChainId, block?: string | number) {
    const blockHash = await BlocksRpc.blockHash(chainId, block)

    // set up method and params
    const method = "state_queryStorageAt" // method we call to fetch
    const params = [[`0x${systemEventsHash}`], blockHash].filter(Boolean)

    // query rpc
    const response = await chainConnector.send(chainId, method, params)

    // get events from response
    const eventsFrame = response[0]?.changes[0][1] || []

    // get SCALE decoder for chain
    const { registry } = await getTypeRegistry(chainId)

    // decode events
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

    return events.map((record) => {
      const { event, phase } = record
      const { section, method, data } = event
      const docs = event.meta.docs.map((doc) => doc.toString()).join(" ")
      const types = event.typeDef

      return {
        section,
        method,
        docs,
        phase,
        data,
        types,
      }
    })
  }
}
