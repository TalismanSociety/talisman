/* eslint-disable @typescript-eslint/no-explicit-any */
import EventEmitter from "events"

import type { SendRequest } from "@extension/core"
import { log } from "@extension/shared"

import {
  ETH_ERROR_EIP1474_INTERNAL_ERROR,
  ETH_ERROR_EIP1993_USER_REJECTED,
  EthProviderRpcError,
  WrappedEthProviderRpcError,
} from "./EthProviderRpcError"

interface RequestArguments {
  readonly method: string
  readonly params?: readonly unknown[] | object
}

interface JsonRpcRequest {
  id: string | undefined
  jsonrpc: "2.0"
  method: string
  params?: Array<unknown>
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

    // MM's internal state object.
    // We need to mimic it because web3onboard uses it (ex: https://de.fi => "Enter App" button)
    _state: {
      accounts: [],
      initialized: false,
      isConnected: false,
      isPermanentlyDisconnected: false,
      isUnlocked: true,
    },

    // Event Emitter (EIP 1993)
    on: eventEmitter.on.bind(eventEmitter),
    off: eventEmitter.off.bind(eventEmitter),
    addListener: eventEmitter.addListener.bind(eventEmitter), // not standard but breaks https://app.pac.finance/ if missing
    removeListener: eventEmitter.removeListener.bind(eventEmitter),
    removeAllListeners: eventEmitter.removeAllListeners.bind(eventEmitter),
  }

  const isConnected = () => {
    return state.initialized
  }

  const initialize = async () => {
    log.debug("Talisman provider initializing")

    const [resChainId, resAccounts] = await Promise.all([
      sendRequest("pub(eth.request)", { method: "eth_chainId" }),
      sendRequest("pub(eth.request)", { method: "eth_accounts" }),
    ])

    const chainId = resChainId as string
    provider.chainId = chainId
    provider.networkVersion = parseInt(chainId, 16).toString()

    const accounts = (resAccounts as unknown as string[]) ?? []
    provider.selectedAddress = accounts?.[0] ?? null
    provider._state.accounts = [...accounts]

    // this subscribes to backend's provider events (https://eips.ethereum.org/EIPS/eip-1193)
    await sendRequest("pub(eth.subscribe)", null, (result) => {
      log.debug("pub(eth.subscribe) callback : %s", result.type, result)

      switch (result.type) {
        // EIP1193
        case "connect":
        case "disconnect":
        case "chainChanged":
        case "accountsChanged": {
          if (result.type === "connect") {
            provider._state.isConnected = true
          }

          // keep provider properties in sync
          if (result.type === "chainChanged") {
            provider.chainId = result.data as string
            provider.networkVersion = parseInt(provider.chainId, 16).toString()
          }

          if (result.type === "accountsChanged") {
            const accounts = (result.data as string[]) ?? []
            provider.selectedAddress = accounts[0] ?? null
            provider._state.accounts = [...accounts]
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
    provider._state.initialized = true

    log.debug("Talisman provider initialized")
  }

  const waitReady = initialize()

  const request = async (args: RequestArguments): Promise<unknown> => {
    try {
      log.debug("[talismanEth.request] request %s", args.method, args.params)
      await waitReady

      const result = await sendRequest("pub(eth.request)", args)
      log.debug("[talismanEth.request] response for %s", args.method, { args, result })
      return result
    } catch (err) {
      log.debug("[talismanEth.request] error on %s", args.method, { err })

      const { code, message, rpcData } = err as WrappedEthProviderRpcError

      if (code > 0) {
        // standard wallet error (user rejected, etc.)
        throw err
      } else {
        // popup closed case, untyped because thrown by window manager
        if (message === "Cancelled")
          throw new EthProviderRpcError("User Rejected Request", ETH_ERROR_EIP1993_USER_REJECTED)

        // RPC node error, wrap it
        throw new EthProviderRpcError(
          "Internal JSON-RPC error.",
          ETH_ERROR_EIP1474_INTERNAL_ERROR,
          rpcData
        )
      }
    }
  }

  const send = (methodOrPayload: any, paramsOrCallback: any) => {
    log.debug("[talismanEth.send]", { methodOrPayload, paramsOrCallback })

    if (typeof methodOrPayload === "string")
      return request({
        method: methodOrPayload,
        params: paramsOrCallback,
      })
    else {
      return request(methodOrPayload).then(paramsOrCallback)
    }
  }

  const sendAsync = async (payload: JsonRpcRequest, callback: JsonRpcCallback) => {
    log.debug("[talismanEth.sendAsync]", payload)

    const { method, params, ...rest } = payload
    try {
      const result = await request({ method, params })
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
    return request({ method: "eth_requestAccounts" })
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
