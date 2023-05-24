import { log } from "@core/log"
import type { ResponseType, SendRequest, SubscriptionCallback } from "@core/types"
import type { ProviderInterfaceCallback } from "@polkadot/rpc-provider/types"
import { Token } from "@talismn/chaindata-provider"

type TalismanWindow = typeof globalThis & {
  talismanSub?: ReturnType<typeof rpcProvider> & ReturnType<typeof tokensProvider>
}

const rpcProvider = (sendRequest: SendRequest) => ({
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
})

const tokensProvider = (sendRequest: SendRequest) => ({
  subscribeCustomTokens: (callback: SubscriptionCallback<Extract<Token, { isCustom: true }>>) => {
    const idPromise = sendRequest("pub(tokens.custom.subscribe)", null, callback)
    return () => idPromise.then((id) => sendRequest("pub(tokens.custom.unsubscribe)", id))
  },
})

export const injectSubstrate = (sendRequest: SendRequest) => {
  // small helper with the typescript types, just cast window
  const windowInject = window as TalismanWindow

  log.debug("Injecting talismanSub")

  windowInject.talismanSub = { ...rpcProvider(sendRequest), ...tokensProvider(sendRequest) }
}
