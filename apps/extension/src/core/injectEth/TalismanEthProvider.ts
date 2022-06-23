import EventEmitter from "events"

import { SendRequest } from "@core/types"

import {
  ETH_ERROR_EIP1474_INTERNAL_ERROR,
  EthProvider,
  EthProviderRpcError,
  EthRequestArguments,
  EthRequestSignatures,
  EthResponseType,
} from "./types"

export class TalismanEthProvider extends EventEmitter implements EthProvider {
  // some libraries (@web3-onboard & wagmi at least) will look for this if we attempt to override window.ethereum
  isTalisman: boolean = true
  // can be turned on from settings, provides compatibility with dapps that only support MetaMask
  isMetaMask: boolean = false
  // cannot use private syntax here (ex: #sendRequest) or wallet won't init on some dapps
  private _sendRequest: SendRequest
  private _initialized: boolean = false

  constructor(sendRequest: SendRequest) {
    super({
      captureRejections: true,
    })

    this._sendRequest = sendRequest
    this._sendRequest("pub(eth.mimicMetaMask)").then((shouldMimicMetaMask) => {
      this.isMetaMask = shouldMimicMetaMask
    })
  }

  isConnected(): boolean {
    // eslint-disable-next-line no-console
    console.debug("TalismanEthProvider : isConnected")
    // TODO
    return this._initialized
  }

  public enable(...args: any[]) {
    // eslint-disable-next-line no-console
    console.debug("[talismanEth.enable] : initialized = %s", this._initialized)
    // some frameworks such as web3modal requires this method to exist
    return this.request({ method: "eth_requestAccounts", params: null })
  }

  // to prevent creating the subscription unless necessary.
  // maybe initialize only on first request() call ? on first eth_requestAccounts ?
  private async initialize(): Promise<void> {
    // eslint-disable-next-line no-console
    console.debug("TalismanEthProvider : pub(eth.subscribe)")

    // this subscribes to backend's provider events :
    // - all client subscriptions (https://eips.ethereum.org/EIPS/eip-758)
    // - all provider status notifications  (https://eips.ethereum.org/EIPS/eip-1193)
    await this._sendRequest("pub(eth.subscribe)", null, (result) => {
      // eslint-disable-next-line no-console
      console.debug("pub(eth.subscribe) callback : %s", result.type, result)

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

  // deprecated, support attempt :)
  async sendAsync({ method, params }: { method: any; params: any[] }) {
    // eslint-disable-next-line no-console
    console.debug("[talismanEth.sendAsync]", { method, params })
    return this.request({ method, params })
  }

  // deprecated, support attempt :)
  async send(methodOrPayload: any, paramsOrCallback: any) {
    // eslint-disable-next-line no-console
    console.debug("[talismanEth.send] request", { methodOrPayload, paramsOrCallback })
    if (typeof methodOrPayload === "string")
      return this.request({
        method: methodOrPayload as keyof EthRequestSignatures,
        params: paramsOrCallback,
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
      console.debug("[talismanEth.request] request %s", args.method, args.params)
      if (!this._initialized) {
        this._initialized = true
        await this.initialize()
      }
      const result = await this._sendRequest("pub(eth.request)", args)
      // eslint-disable-next-line no-console
      console.debug("[talismanEth.request] result for %s", args.method, result)
      return result
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err)
      if (err instanceof EthProviderRpcError) {
        const { code, message, name } = err
        // eslint-disable-next-line no-console
        console.debug("[talismanEth.request] RPC error on %s", args.method, { code, message, name })
        throw err
      }
      // eslint-disable-next-line no-console
      console.debug("[talismanEth.request] error on %s", args.method, err)

      throw new EthProviderRpcError((err as Error).message, ETH_ERROR_EIP1474_INTERNAL_ERROR)
    }
  }
}
