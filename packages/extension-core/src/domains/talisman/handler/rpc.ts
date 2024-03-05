import assert from "assert"

import { TabsHandler } from "../../../libs/Handler"
import { chainConnector } from "../../../rpcs/chain-connector"
import { chaindataProvider } from "../../../rpcs/chaindata"
import type { MessageTypes, RequestType, ResponseType } from "../../../types"
import type { Port } from "../../../types/base"
import {
  RequestRpcByGenesisHashSend,
  RequestRpcByGenesisHashSubscribe,
  RequestRpcByGenesisHashUnsubscribe,
  UnknownJsonRpcResponse,
} from "../types"

export default class TalismanRpcHandler extends TabsHandler {
  #talismanByGenesisHashSubscriptions = new Map<string, (unsubscribeMethod: string) => void>()

  private async rpcTalismanByGenesisHashSend(
    request: RequestRpcByGenesisHashSend
  ): Promise<UnknownJsonRpcResponse> {
    const { genesisHash, method, params } = request

    const chain = await chaindataProvider.chainByGenesisHash(genesisHash)
    assert(chain, `Chain with genesisHash '${genesisHash}' not found`)

    return await chainConnector.send(chain.id, method, params)
  }

  private async rpcTalismanByGenesisHashSubscribe(
    request: RequestRpcByGenesisHashSubscribe,
    id: string,
    port: Port
  ): Promise<string> {
    const subscriptionId = `${port.name}-${id}`

    const { genesisHash, subscribeMethod, responseMethod, params, timeout } = request

    const chain = await chaindataProvider.chainByGenesisHash(genesisHash)
    assert(chain, `Chain with genesisHash '${genesisHash}' not found`)

    const unsubscribe = await chainConnector.subscribe(
      chain.id,
      subscribeMethod,
      responseMethod,
      params,
      (error, data) => {
        try {
          port.postMessage({ id, subscription: { error, data } })
        } catch (error) {
          // end subscription when port no longer exists
          //
          // unfortunately, we won't know what unsubscribe method to call on the rpc itself
          // so we'll continue to receive updates from the rpc until it's also disconnected
          //
          // but we can at least stop trying to send those updates down to the disconnected port
          //
          // this is a design limitation due to the `ProviderInterface` which we must support
          // in order to use ChainConnector with ApiPromise from the @polkadot/api package
          // this interface doesn't provide the unsubscribeMethod for a subscription until
          // later when the consumer is preparing to unsubscribe
          unsubscribe("")
        }
      },
      timeout
    )

    this.#talismanByGenesisHashSubscriptions.set(subscriptionId, unsubscribe)
    port.onDisconnect.addListener(() =>
      // end subscription when port closes
      this.rpcTalismanByGenesisHashUnsubscribe({ subscriptionId, unsubscribeMethod: "" })
    )

    return subscriptionId
  }

  private async rpcTalismanByGenesisHashUnsubscribe(
    request: RequestRpcByGenesisHashUnsubscribe
  ): Promise<boolean> {
    const { subscriptionId, unsubscribeMethod } = request

    if (!this.#talismanByGenesisHashSubscriptions.has(subscriptionId)) return false

    const unsubscribe = this.#talismanByGenesisHashSubscriptions.get(subscriptionId)
    this.#talismanByGenesisHashSubscriptions.delete(subscriptionId)

    unsubscribe && unsubscribe(unsubscribeMethod)

    return true
  }

  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestType<TMessageType>,
    port: Port,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    url: string
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      case "pub(talisman.rpc.byGenesisHash.send)":
        return this.rpcTalismanByGenesisHashSend(request as RequestRpcByGenesisHashSend)

      case "pub(talisman.rpc.byGenesisHash.subscribe)":
        return this.rpcTalismanByGenesisHashSubscribe(
          request as RequestRpcByGenesisHashSubscribe,
          id,
          port
        )

      case "pub(talisman.rpc.byGenesisHash.unsubscribe)":
        return this.rpcTalismanByGenesisHashUnsubscribe(
          request as RequestRpcByGenesisHashUnsubscribe
        )

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
