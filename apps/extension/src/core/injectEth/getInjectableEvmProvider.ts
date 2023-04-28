/* eslint-disable @typescript-eslint/no-explicit-any */
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

  // return a provider object with methods that aren't bound to the instance
  // prevents errors on dapps which unbind methods of the object (ex: orbiter.finance)
  // makes it hard to type, but we don't need to as we don't consume it ourselves
  const provider: any = {
    isTalisman: true,
    isMetaMask: true, // dapps use this to determine if wallet supports adding custom networks and tokens

    // MM's quick access properties
    networkVersion: null,
    chainId: null,
    selectedAddress: null,

    // MM's experimental methods
    // if this object is missing, some dapps won't prompt for login
    _metamask: {},

    // Event Emitter (EIP 1993)
    on: eventEmitter.on.bind(eventEmitter),
    off: eventEmitter.off.bind(eventEmitter),
    removeListener: eventEmitter.removeListener.bind(eventEmitter),
    removeAllListeners: eventEmitter.removeAllListeners.bind(eventEmitter),
  }

  const isConnected = () => {
    return state.initialized
  }

  const initialize = async () => {
    log.debug("Talisman provider initializing")

    const [resChainId, resAccounts] = await Promise.all([
      sendRequest("pub(eth.request)", {
        method: "eth_chainId",
        params: null,
      }),
      sendRequest("pub(eth.request)", {
        method: "eth_accounts",
        params: null,
      }),
    ])

    const chainId = resChainId as string
    provider.chainId = chainId
    provider.networkVersion = parseInt(chainId, 16).toString()

    const accounts = (resAccounts as unknown as string[]) ?? []
    provider.selectedAddress = accounts?.[0] ?? null

    // this subscribes to backend's provider events (https://eips.ethereum.org/EIPS/eip-1193)
    await sendRequest("pub(eth.subscribe)", null, (result) => {
      log.debug("pub(eth.subscribe) callback : %s", result.type, result)

      switch (result.type) {
        // EIP1193
        case "connect":
        case "disconnect":
        case "chainChanged":
        case "accountsChanged": {
          // keep provider properties in sync
          if (result.type === "chainChanged") {
            provider.chainId = result.data as string
            provider.networkVersion = parseInt(provider.chainId, 16).toString()
          }

          if (result.type === "accountsChanged") {
            provider.selectedAddress = (result.data as string[])[0] ?? null
          }

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

    state.initialized = true

    log.debug("Talisman provider initialized")
  }

  const waitReady = initialize()

  const request = async <TEthMessageType extends keyof EthRequestSignatures>(
    args: EthRequestArguments<TEthMessageType>
  ): Promise<EthResponseType<TEthMessageType>> => {
    try {
      log.debug("[talismanEth.request] request %s", args.method, args.params)
      await waitReady

      const result = await sendRequest("pub(eth.request)", args)
      log.debug("[talismanEth.request] response for %s", args.method, { args, result })
      return result
    } catch (err) {
      log.debug("[talismanEth.request] error on %s", args.method, { err })

      const { code, message, data } = err as EthProviderRpcError

      if (code > 0) {
        // standard wallet error (user rejected, etc.)
        throw err
      } else {
        // RPC node error, wrap it
        throw new EthProviderRpcError(
          "Internal JSON-RPC error.",
          ETH_ERROR_EIP1474_INTERNAL_ERROR,
          { code, message, data }
        )
      }
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
    log.debug("[talismanEth.enable]")

    // some frameworks such as web3modal requires this method to exist
    return request({ method: "eth_requestAccounts", params: null })
  }

  provider.isConnected = isConnected
  provider.request = request
  provider.send = send
  provider.sendAsync = sendAsync
  provider.enable = enable

  return new Proxy(provider, {
    // prevent old web3 library version from removing sendAsync function
    // ex : https://polygonscan.com/
    deleteProperty: () => true,
  })
}
