import EventEmitter from "events"

import { DEBUG } from "@core/constants"
import { SendRequest } from "@core/types"

import {
  ETH_ERROR_EIP1474_INTERNAL_ERROR,
  EthProvider,
  EthProviderRpcError,
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

// save access to console methods in case dapps replaces them (ex : opensea)
// eslint-disable-next-line no-console
const safeConsoleDebug = DEBUG ? console.debug : () => {}
// eslint-disable-next-line no-console
const safeConsoleError = DEBUG ? console.error : () => {}

export class TalismanEthProvider extends EventEmitter implements EthProvider {
  // some libraries (@web3-onboard & wagmi at least) will look for this if we attempt to override window.ethereum
  isTalisman = true
  // can be turned on from settings, provides compatibility with dapps that only support MetaMask
  isMetaMask = false
  // cannot use private syntax here (ex: #sendRequest) or wallet won't init on some dapps
  private _sendRequest: SendRequest
  private _initialized = false

  // if this is missing, some dapps won't prompt for login
  private _metamask: any

  constructor(sendRequest: SendRequest) {
    super({
      captureRejections: true,
    })

    this._sendRequest = sendRequest
    this._sendRequest("pub(eth.mimicMetaMask)").then((shouldMimicMetaMask) => {
      this.isMetaMask = shouldMimicMetaMask
      if (shouldMimicMetaMask) {
        this._metamask = {}
        // some dapps (ex moonriver.moonscan.io), still use web3 object send wallet_* messages
        const myWindow = window as { web3?: { currentProvider?: any } }
        if (!myWindow.web3)
          myWindow.web3 = {
            currentProvider: this,
          }
      }
    })
  }

  isConnected(): boolean {
    // eslint-disable-next-line no-console
    safeConsoleDebug("TalismanEthProvider : isConnected()", this._initialized)
    return this._initialized
  }

  public enable() {
    // eslint-disable-next-line no-console
    safeConsoleDebug("[talismanEth.enable] : (initialized = %s)", this._initialized)
    // some frameworks such as web3modal requires this method to exist
    return this.request({ method: "eth_requestAccounts", params: null })
  }

  // to prevent creating the subscription unless necessary.
  // maybe initialize only on first request() call ? on first eth_requestAccounts ?
  private async initialize(): Promise<void> {
    // eslint-disable-next-line no-console
    safeConsoleDebug("TalismanEthProvider : pub(eth.subscribe)")

    // this subscribes to backend's provider events :
    // - all client subscriptions (https://eips.ethereum.org/EIPS/eip-758)
    // - all provider status notifications  (https://eips.ethereum.org/EIPS/eip-1193)
    await this._sendRequest("pub(eth.subscribe)", null, (result) => {
      // eslint-disable-next-line no-console
      safeConsoleDebug("pub(eth.subscribe) callback : %s", result.type, result)

      switch (result.type) {
        // EIP1193
        case "connect":
        case "disconnect":
        case "chainChanged":
        case "accountsChanged":
          return this.emit(result.type, result.data)

        // UNKNOWN
        default:
          // eslint-disable-next-line no-console
          return console.warn("Unknown ETH subscription message type : %s", result.type, result)
      }
    })
  }

  async sendAsync(payload: JsonRpcRequest, callback: JsonRpcCallback) {
    // eslint-disable-next-line no-console
    safeConsoleDebug("[talismanEth.sendAsync]", payload)

    const { method, params, ...rest } = payload
    try {
      const result = await this.request({
        method: method as EthRequestTypes,
        params: params as any,
      })
      callback(null, { ...rest, method, result })
    } catch (err) {
      const error = err as Error
      safeConsoleError("ERROR sendAsync", error)
      callback(error, { ...rest, method, error })
    }
  }

  // deprecated, support attempt
  async send(methodOrPayload: any, paramsOrCallback: any) {
    // eslint-disable-next-line no-console
    safeConsoleDebug("[talismanEth.send]", { methodOrPayload, paramsOrCallback })
    if (typeof methodOrPayload === "string")
      return this.request({
        method: methodOrPayload as keyof EthRequestSignatures,
        params: paramsOrCallback as any,
      })
    else {
      return this.request(methodOrPayload).then(paramsOrCallback)
    }
  }

  async request<TEthMessageType extends keyof EthRequestSignatures>(
    args: EthRequestArguments<TEthMessageType>
  ): Promise<EthResponseType<TEthMessageType>> {
    try {
      // eslint-disable-next-line no-console
      safeConsoleDebug("[talismanEth.request] request %s", args.method, args.params)
      if (!this._initialized) {
        this._initialized = true
        await this.initialize()
      }
      const result = await this._sendRequest("pub(eth.request)", args)
      // eslint-disable-next-line no-console
      safeConsoleDebug("[talismanEth.request] response for %s", args.method, { args, result })
      return result
    } catch (err) {
      // eslint-disable-next-line no-console
      safeConsoleError(err)
      if (err instanceof EthProviderRpcError) {
        const { code, message, name } = err
        // eslint-disable-next-line no-console
        safeConsoleDebug("[talismanEth.request] RPC error on %s", args.method, {
          code,
          message,
          name,
        })
        throw err
      }
      // eslint-disable-next-line no-console
      safeConsoleDebug("[talismanEth.request] error on %s", args.method, err)

      throw new EthProviderRpcError((err as Error).message, ETH_ERROR_EIP1474_INTERNAL_ERROR)
    }
  }
}
