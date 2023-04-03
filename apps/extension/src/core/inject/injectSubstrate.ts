import { log } from "@core/log"
import { ResponseType, SendRequest } from "@core/types"
import type { ProviderInterfaceCallback } from "@polkadot/rpc-provider/types"

type TalismanWindow = Window &
  typeof globalThis & {
    talismanSub?: any
  }

export const injectSubstrate = (sendRequest: SendRequest) => {
  // small helper with the typescript types, just cast window
  const windowInject = window as TalismanWindow

  const provider = {
    rpcByGenesisHashSend: (
      genesisHash: string,
      method: string,
      params: unknown[]
    ): Promise<ResponseType<"pub(rpc.talisman.byGenesisHash.send)">> =>
      sendRequest("pub(rpc.talisman.byGenesisHash.send)", { genesisHash, method, params }),

    rpcByGenesisHashSubscribe: (
      genesisHash: string,
      subscribeMethod: string,
      responseMethod: string,
      params: unknown[],
      callback: ProviderInterfaceCallback,
      timeout: number | false
    ): Promise<ResponseType<"pub(rpc.talisman.byGenesisHash.subscribe)">> =>
      sendRequest(
        "pub(rpc.talisman.byGenesisHash.subscribe)",
        { genesisHash, subscribeMethod, responseMethod, params, timeout },
        ({ error, data }) => callback(error, data)
      ),

    rpcByGenesisHashUnsubscribe: (
      subscriptionId: string,
      unsubscribeMethod: string
    ): Promise<ResponseType<"pub(rpc.talisman.byGenesisHash.unsubscribe)">> =>
      sendRequest("pub(rpc.talisman.byGenesisHash.unsubscribe)", {
        subscriptionId,
        unsubscribeMethod,
      }),
  }

  log.debug("Injecting talismanSub")
  windowInject.talismanSub = provider
}
