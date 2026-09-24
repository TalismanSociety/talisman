import type { ResponseType, SendRequest } from "@core/types"
import type { HexString } from "@talismn/util"

// structural equivalent of the legacy polkadot-js ProviderInterfaceCallback type
// biome-ignore lint/suspicious/noExplicitAny: legacy
type ProviderInterfaceCallback = (error: Error | null, result: any) => void

type TalismanWindow = typeof globalThis & {
  talismanSub?: ReturnType<typeof rpcProvider> & ReturnType<typeof extensionUiProvider>
}

const rpcProvider = (sendRequest: SendRequest) => ({
  rpcByGenesisHashSend: (
    genesisHash: HexString,
    method: string,
    params: unknown[]
  ): Promise<ResponseType<"pub(talisman.rpc.byGenesisHash.send)">> =>
    sendRequest("pub(talisman.rpc.byGenesisHash.send)", { genesisHash, method, params }),

  rpcByGenesisHashSubscribe: (
    genesisHash: HexString,
    subscribeMethod: string,
    responseMethod: string,
    params: unknown[],
    callback: ProviderInterfaceCallback,
    timeout: number | false
  ): Promise<ResponseType<"pub(talisman.rpc.byGenesisHash.subscribe)">> =>
    sendRequest(
      "pub(talisman.rpc.byGenesisHash.subscribe)",
      { genesisHash, subscribeMethod, responseMethod, params, timeout },
      ({ error, data }) => callback(error, data)
    ),

  rpcByGenesisHashUnsubscribe: (
    subscriptionId: string,
    unsubscribeMethod: string
  ): Promise<ResponseType<"pub(talisman.rpc.byGenesisHash.unsubscribe)">> =>
    sendRequest("pub(talisman.rpc.byGenesisHash.unsubscribe)", {
      subscriptionId,
      unsubscribeMethod,
    }),
})

const extensionUiProvider = (sendRequest: SendRequest) => ({
  openFullscreenPortfolio: () => sendRequest("pub(talisman.extension.openPortfolio)", null),
})

export const injectSubstrate = (sendRequest: SendRequest) => {
  // small helper with the typescript types, just cast window
  const windowInject = window as TalismanWindow

  windowInject.talismanSub = {
    ...rpcProvider(sendRequest),
    ...extensionUiProvider(sendRequest),
  }
}
