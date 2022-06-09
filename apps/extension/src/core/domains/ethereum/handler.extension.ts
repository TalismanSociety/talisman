import {
  EthereumNetwork,
  MessageTypes,
  RequestTypes,
  ResponseType,
  Port,
  RequestIdOnly,
  EthApproveSignAndSend,
  AnyEthRequestChainId,
} from "@core/types"
import { ExtensionHandler } from "@core/libs/Handler"
import { assert, u8aToHex } from "@polkadot/util"
import {
  EthProviderRpcError,
  EthRequestSignatures,
  EthRequestArguments,
  ETH_ERROR_EIP1993_USER_REJECTED,
} from "@core/injectEth/types"
import { getUnlockedPairFromAddress } from "@core/handlers/helpers"
import {
  concat,
  toUtf8Bytes,
  serializeTransaction,
  parseUnits,
  formatUnits,
} from "ethers/lib/utils"
import { BigNumber, ethers } from "ethers"
import type { Bytes, UnsignedTransaction } from "ethers"
import type { TransactionRequest } from "@ethersproject/providers"
import isString from "lodash/isString"
import { getProviderForChainId } from "./networksStore"
import { watchEthereumTransaction } from "@core/notifications"

// turns errors into short and human readable message.
// main use case is teling the user why a transaction failed without going into details and clutter the UI
const getHumanReadableErrorMessage = (error: unknown) => {
  const { code, reason } = error as { code?: string; reason?: string }
  if (reason) return reason
  if (code === ethers.errors.INSUFFICIENT_FUNDS) return "Insufficient balance"
  if (code === ethers.errors.CALL_EXCEPTION) return "Contract method failed"
  if (code === ethers.errors.NETWORK_ERROR) return "Network error"
  if (code === ethers.errors.NONCE_EXPIRED) return "Nonce expired"
  if (code === ethers.errors.UNSUPPORTED_OPERATION) return "Unsupported operation"
  if (code === ethers.errors.NOT_IMPLEMENTED) return "Not implemented"
  if (code === ethers.errors.TIMEOUT) return "Timeout exceeded"
  if (code === ethers.errors.UNEXPECTED_ARGUMENT) return "Unexpected argument"
  if (code === ethers.errors.BUFFER_OVERRUN) return "Buffer overrun"
  if (code === ethers.errors.MISSING_ARGUMENT) return "Missing argument"
  if (code === ethers.errors.UNEXPECTED_ARGUMENT) return "Unexpected argument"
  if (code === ethers.errors.INVALID_ARGUMENT) return "Invalid argument"
  if (code === ethers.errors.SERVER_ERROR) return "Server error"

  // let the catch block decide what to display
  return undefined
}

const messagePrefix = "\x19Ethereum Signed Message:\n"
const addSafeSigningPrefix = (message: string | Bytes) => {
  if (typeof message === "string") message = toUtf8Bytes(message)
  return concat([toUtf8Bytes(messagePrefix), toUtf8Bytes(String(message.length)), message])
}

type UnsignedTxWithGas = Omit<TransactionRequest, "gasLimit"> & { gas: string }

const txRequestToUnsignedTx = (tx: TransactionRequest | UnsignedTxWithGas): UnsignedTransaction => {
  // we're using EIP1559 so gasPrice must be removed
  let { from, gasPrice, ...unsignedTx } = tx
  if ("gas" in unsignedTx) {
    const { gas, ...rest1 } = unsignedTx as UnsignedTxWithGas
    unsignedTx = { ...rest1, gasLimit: BigNumber.from(gas ?? "250000") }
  }

  if (unsignedTx.nonce) {
    const { nonce, ...rest2 } = unsignedTx
    if (BigNumber.isBigNumber(nonce)) {
      unsignedTx = { nonce: nonce.toNumber(), ...rest2 }
    } else if (isString(nonce)) {
      unsignedTx = { nonce: parseInt(nonce), ...rest2 }
    }
  }
  return unsignedTx as UnsignedTransaction
}

export class EthHandler extends ExtensionHandler {
  private async signAndSendApprove({
    id,
    maxFeePerGas: strMaxFeePerGas = formatUnits(2, "gwei"),
    maxPriorityFeePerGas: strMaxPriorityFeePerGas = formatUnits(0, "gwei"),
  }: EthApproveSignAndSend): Promise<boolean> {
    try {
      const queued = this.state.requestStores.signing.getEthSignAndSendRequest(id)
      assert(queued, "Unable to find request")
      const { request, provider, resolve, reject } = queued

      const nonce = await provider.getTransactionCount(queued.account.address)
      const maxFeePerGas = parseUnits(strMaxFeePerGas, "wei")
      const maxPriorityFeePerGas = parseUnits(strMaxPriorityFeePerGas, "wei")

      const goodTx = txRequestToUnsignedTx({
        maxFeePerGas,
        maxPriorityFeePerGas,
        nonce,
        type: 2,
        ...request,
      })

      const serialisedTx = serializeTransaction(goodTx)
      try {
        var pair = getUnlockedPairFromAddress(queued.account.address)
      } catch (error) {
        this.stores.password.clearPassword()
        reject(
          error instanceof Error ? error : new Error(typeof error === "string" ? error : undefined)
        )
        return false
      }
      const signature = await pair.sign(serialisedTx)

      const serialisedSignedTx = serializeTransaction(goodTx, signature)
      const { chainId, hash } = await provider.sendTransaction(serialisedSignedTx)

      // notify user about transaction progress
      if (await this.stores.settings.get("allowNotifications"))
        watchEthereumTransaction(chainId, hash)

      resolve(hash)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err, { err })
      const msg = getHumanReadableErrorMessage(err)
      if (msg) throw new Error(msg)
      throw err
    }
    return true
  }

  private async signApprove({ id }: RequestIdOnly): Promise<boolean> {
    try {
      const queued = this.state.requestStores.signing.getEthSignRequest(id)

      assert(queued, "Unable to find request")

      const { request, reject, resolve } = queued

      try {
        var pair = getUnlockedPairFromAddress(queued.account.address)
      } catch (error) {
        this.stores.password.clearPassword()
        reject(
          error instanceof Error ? error : new Error(typeof error === "string" ? error : undefined)
        )
        return false
      }

      const signature = await pair.sign(addSafeSigningPrefix(request))
      resolve(u8aToHex(signature))

      return true
    } catch (err) {
      const msg = getHumanReadableErrorMessage(err)
      if (msg) throw new Error(msg)
      throw err
    }
  }

  private signingCancel({ id }: RequestIdOnly): boolean {
    const queued = this.state.requestStores.signing.getEthRequest(id)

    assert(queued, "Unable to find request")

    const { reject } = queued

    reject(new EthProviderRpcError("Cancelled", ETH_ERROR_EIP1993_USER_REJECTED))

    return true
  }

  private ethNetworkAddCancel({ id }: RequestIdOnly): boolean {
    const queued = this.state.requestStores.networks.getRequest(id)

    assert(queued, "Unable to find request")

    const { reject } = queued

    reject(new EthProviderRpcError("Rejected", ETH_ERROR_EIP1993_USER_REJECTED))

    return true
  }

  private async ethNetworkAddApprove({ id }: RequestIdOnly): Promise<boolean> {
    const queued = this.state.requestStores.networks.getRequest(id)

    assert(queued, "Unable to find request")

    const { network, resolve } = queued
    const newNetwork: EthereumNetwork = {
      id: parseInt(network.chainId, 16),
      name: network.chainName,
      nativeToken: network.nativeCurrency
        ? {
            name: network.nativeCurrency.name,
            symbol: network.nativeCurrency.symbol,
            decimals: network.nativeCurrency.decimals,
          }
        : undefined,
      rpcs: (network.rpcUrls || []).map((url) => ({ url, isHealthy: true })),
      explorerUrls: network.blockExplorerUrls || [],
      iconUrls: network.iconUrls || [],
      isCustom: true,
    }

    await this.stores.ethereumNetworks.set({ [newNetwork.id]: newNetwork })

    resolve(null)

    return true
  }

  private ethWatchAssetRequestCancel({ id }: RequestIdOnly): boolean {
    const queued = this.state.requestStores.evmAssets.getRequest(id)

    assert(queued, "Unable to find request")

    const { reject } = queued

    reject(new EthProviderRpcError("Rejected", ETH_ERROR_EIP1993_USER_REJECTED))

    return true
  }

  private async ethWatchAssetRequestApprove({ id }: RequestIdOnly): Promise<boolean> {
    const queued = this.state.requestStores.evmAssets.getRequest(id)

    assert(queued, "Unable to find request")

    const { resolve, token } = queued

    await this.stores.evmAssets.setItem(token)

    resolve(true)

    return true
  }

  private async ethRequest<TEthMessageType extends keyof EthRequestSignatures>(
    id: string,
    chainId: number,
    request: EthRequestArguments<TEthMessageType>
  ): Promise<unknown> {
    const provider = await getProviderForChainId(chainId)
    assert(provider, `No healthy RPCs available for provider for chain ${chainId}`)
    const result = await provider.send(request.method, request.params as unknown as any[])
    // eslint-disable-next-line no-console
    console.debug(request.method, request.params, result)
    return result
  }

  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
    port: Port
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      case "pri(eth.signing.approveSignAndSend)":
        return this.signAndSendApprove(request as EthApproveSignAndSend)

      case "pri(eth.signing.approveSign)":
        return await this.signApprove(request as RequestIdOnly)

      case "pri(eth.signing.cancel)":
        return this.signingCancel(request as RequestIdOnly)

      // --------------------------------------------------------------------
      // ethereum watch asset requests handlers -----------------------------
      // --------------------------------------------------------------------
      case "pri(eth.watchasset.requests.cancel)":
        return this.ethWatchAssetRequestCancel(request as RequestIdOnly)

      case "pri(eth.watchasset.requests.approve)":
        return this.ethWatchAssetRequestApprove(request as RequestIdOnly)

      case "pri(eth.watchasset.requests.subscribe)":
        return this.state.requestStores.evmAssets.subscribe<"pri(eth.watchasset.requests.subscribe)">(
          id,
          port
        )

      // --------------------------------------------------------------------
      // ethereum network handlers ------------------------------------------
      // --------------------------------------------------------------------
      case "pri(eth.networks.add.cancel)":
        return this.ethNetworkAddCancel(request as RequestIdOnly)

      case "pri(eth.networks.add.approve)":
        return this.ethNetworkAddApprove(request as RequestIdOnly)

      case "pri(eth.networks.add.requests)":
        return this.state.requestStores.networks.getAllRequests()

      case "pri(eth.networks.add.subscribe)":
        return this.state.requestStores.networks.subscribe<"pri(eth.networks.add.subscribe)">(
          id,
          port
        )

      case "pri(eth.networks)":
        return this.stores.ethereumNetworks.ethereumNetworks()

      case "pri(eth.networks.byid)":
        return this.stores.ethereumNetworks.ethereumNetwork(
          parseInt((request as RequestIdOnly).id, 10)
        )

      case "pri(eth.networks.subscribe)":
        return this.stores.ethereumNetworks.subscribe(id, port)

      case "pri(eth.networks.byid.subscribe)":
        return this.stores.ethereumNetworks.subscribeById(id, port, request as RequestIdOnly)

      case "pri(eth.networks.add.custom)": {
        const newNetwork = request as RequestTypes["pri(eth.networks.add.custom)"]

        newNetwork.isCustom = true
        await this.stores.ethereumNetworks.set({ [newNetwork.id]: newNetwork })

        return true
      }

      case "pri(eth.networks.removeCustomNetwork)": {
        const id = parseInt(
          (request as RequestTypes["pri(eth.networks.removeCustomNetwork)"]).id,
          10
        )

        await this.stores.ethereumNetworks.delete(id)

        return true
      }

      case "pri(eth.networks.clearCustomNetworks)": {
        await this.stores.ethereumNetworks.clear()

        return true
      }

      case "pri(eth.request)":
        const { chainId: ethChainId, ...rest } = request as AnyEthRequestChainId
        return this.ethRequest(id, ethChainId, rest)
    }
    throw new Error(`Unable to handle message of type ${type}`)
  }
}
