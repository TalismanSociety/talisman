import type { ProviderInterfaceCallback } from "@polkadot/rpc-provider/types"
import type { HexString } from "@polkadot/util/types"
import type { DotNetwork, EthNetwork, Token } from "@talismn/chaindata-provider"
import type { ResponseType, SendRequest } from "extension-core"

type TalismanWindow = typeof globalThis & {
  talismanSub?: ReturnType<typeof rpcProvider> &
    ReturnType<typeof tokensProvider> &
    ReturnType<typeof extensionUiProvider>
}

const rpcProvider = (sendRequest: SendRequest) => ({
  rpcByGenesisHashSend: (
    genesisHash: HexString,
    method: string,
    params: unknown[],
  ): Promise<ResponseType<"pub(talisman.rpc.byGenesisHash.send)">> =>
    sendRequest("pub(talisman.rpc.byGenesisHash.send)", { genesisHash, method, params }),

  rpcByGenesisHashSubscribe: (
    genesisHash: HexString,
    subscribeMethod: string,
    responseMethod: string,
    params: unknown[],
    callback: ProviderInterfaceCallback,
    timeout: number | false,
  ): Promise<ResponseType<"pub(talisman.rpc.byGenesisHash.subscribe)">> =>
    sendRequest(
      "pub(talisman.rpc.byGenesisHash.subscribe)",
      { genesisHash, subscribeMethod, responseMethod, params, timeout },
      ({ error, data }) => callback(error, data),
    ),

  rpcByGenesisHashUnsubscribe: (
    subscriptionId: string,
    unsubscribeMethod: string,
  ): Promise<ResponseType<"pub(talisman.rpc.byGenesisHash.unsubscribe)">> =>
    sendRequest("pub(talisman.rpc.byGenesisHash.unsubscribe)", {
      subscriptionId,
      unsubscribeMethod,
    }),
})

const tokensProvider = (sendRequest: SendRequest) => ({
  subscribeCustomSubstrateChains: (callback: (chains: DotNetwork[]) => unknown) => {
    const idPromise = sendRequest("pub(talisman.customSubstrateChains.subscribe)", null, callback)
    return () =>
      idPromise.then((id) => sendRequest("pub(talisman.customSubstrateChains.unsubscribe)", id))
  },
  subscribeCustomEvmNetworks: (callback: (networks: EthNetwork[]) => unknown) => {
    const idPromise = sendRequest("pub(talisman.customEvmNetworks.subscribe)", null, callback)
    return () =>
      idPromise.then((id) => sendRequest("pub(talisman.customEvmNetworks.unsubscribe)", id))
  },
  subscribeCustomTokens: (callback: (tokens: Token[]) => unknown) => {
    const idPromise = sendRequest("pub(talisman.customTokens.subscribe)", null, callback)
    return () => idPromise.then((id) => sendRequest("pub(talisman.customTokens.unsubscribe)", id))
  },
})

const extensionUiProvider = (sendRequest: SendRequest) => ({
  openFullscreenPortfolio: () => sendRequest("pub(talisman.extension.openPortfolio)", null),
})

export const injectSubstrate = (sendRequest: SendRequest) => {
  // small helper with the typescript types, just cast window
  const windowInject = window as TalismanWindow

  windowInject.talismanSub = {
    ...rpcProvider(sendRequest),
    ...tokensProvider(sendRequest),
    ...extensionUiProvider(sendRequest),
  }
}
