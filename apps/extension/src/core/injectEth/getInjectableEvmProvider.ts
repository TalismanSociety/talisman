import EventEmitter from "events"

import { log } from "@core/log"
import type { SendRequest } from "@core/types"

import { ETH_ERROR_EIP1474_INTERNAL_ERROR, EthProviderRpcError } from "./EthProviderRpcError"
import type {
  EthRequestArguments,
  EthRequestSignatures,
  EthRequestTypes,
  EthResponseType,
} from "./types"

interface JsonRpcRequest {
  id: string | undefined
  jsonrpc: "2.0"
  method: string
  params?: Array<any>
}

interface JsonRpcResponse {
  id: string | undefined
  jsonrpc: "2.0"
  method: string
  result?: unknown
  error?: Error
}

type JsonRpcCallback = (error: Error | null, response: JsonRpcResponse | null) => unknown

export const getInjectableEvmProvider = (sendRequest: SendRequest) => {
  const eventEmitter = new EventEmitter({ captureRejections: true })

  const state = {
    initialized: false,
  }

  // use functional programming pattern to return a provider whose methods aren't bound to the instance
  // prevents errors on dapps which unbind methods of the object (ex: orbiter.finance)
  // makes it hard to type, but we don't need to as we don't consume it ourselves
  const provider: any = {
    isTalisman: true,
    isMetaMask: true,
    _metamask: {
      // MM's experimental methods
      // if this is property is missing, some dapps won't prompt for login
    },
    on: eventEmitter.on.bind(eventEmitter),
    off: eventEmitter.off.bind(eventEmitter),
    removeListener: eventEmitter.removeListener.bind(eventEmitter),
  }

  const isConnected = () => {
    return state.initialized
  }

  const initialize = async () => {
    log.debug("TalismanEthProvider : pub(eth.subscribe)")

    // query before init so it doesn't trigger a chainChanged event
    provider.chainId = (await sendRequest("pub(eth.request)", {
      method: "eth_chainId",
      params: null,
    })) as string

    // this subscribes to backend's provider events (https://eips.ethereum.org/EIPS/eip-1193)
    await sendRequest("pub(eth.subscribe)", null, (result) => {
      log.debug("pub(eth.subscribe) callback : %s", result.type, result)

      switch (result.type) {
        // EIP1193
        case "connect":
        case "disconnect":
        case "chainChanged":
        case "accountsChanged": {
          // keep chainId field in sync
          if (result.type === "chainChanged") provider.chainId = result.data as string

          // broadcast event to dapp
          eventEmitter.emit(result.type, result.data)
          break
        }

        // UNKNOWN
        default:
          // eslint-disable-next-line no-console
          console.warn("Unknown ETH subscription message type : %s", result.type, result)
          break
      }
    })
  }

  const request = async <TEthMessageType extends keyof EthRequestSignatures>(
    args: EthRequestArguments<TEthMessageType>
  ): Promise<EthResponseType<TEthMessageType>> => {
    try {
      log.debug("[talismanEth.request] request %s", args.method, args.params)
      if (!state.initialized) {
        state.initialized = true
        await initialize()
      }
      const result = await sendRequest("pub(eth.request)", args)
      log.debug("[talismanEth.request] response for %s", args.method, { args, result })
      return result
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err)
      if (err instanceof EthProviderRpcError) {
        const { code, message, name } = err
        log.debug("[talismanEth.request] RPC error on %s", args.method, {
          code,
          message,
          name,
        })
        throw err
      }
      log.debug("[talismanEth.request] error on %s", args.method, err)

      throw new EthProviderRpcError((err as Error).message, ETH_ERROR_EIP1474_INTERNAL_ERROR)
    }
  }

  const send = (methodOrPayload: any, paramsOrCallback: any) => {
    log.debug("[talismanEth.send]", { methodOrPayload, paramsOrCallback })
    if (typeof methodOrPayload === "string")
      return request({
        method: methodOrPayload as keyof EthRequestSignatures,
        params: paramsOrCallback as any,
      })
    else {
      return request(methodOrPayload).then(paramsOrCallback)
    }
  }

  const sendAsync = async (payload: JsonRpcRequest, callback: JsonRpcCallback) => {
    log.debug("[talismanEth.sendAsync]", payload)

    const { method, params, ...rest } = payload
    try {
      const result = await request({
        method: method as EthRequestTypes,
        params: params as any,
      })
      callback(null, { ...rest, method, result })
    } catch (err) {
      const error = err as Error
      log.error("ERROR sendAsync", error)
      callback(error, { ...rest, method, error })
    }
  }

  const enable = () => {
    // some frameworks such as web3modal requires this method to exist
    return request({ method: "eth_requestAccounts", params: null })
  }

  provider.isConnected = isConnected
  provider.request = request
  provider.send = send
  provider.sendAsync = sendAsync
  provider.enable = enable

  return provider
}
