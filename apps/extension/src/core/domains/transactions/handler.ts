import { DEBUG } from "@core/constants"
import BlocksRpc from "@core/domains/blocks/rpc"
import { ChainId } from "@core/domains/chains/types"
import { getEthTransferTransactionBase, rebuildGasSettings } from "@core/domains/ethereum/helpers"
import { getProviderForEvmNetworkId } from "@core/domains/ethereum/rpcProviders"
import {
  getTransactionCount,
  incrementTransactionCount,
} from "@core/domains/ethereum/transactionCountManager"
import EventsRpc from "@core/domains/events/rpc"
import AssetTransfersRpc from "@core/domains/transactions/rpc/AssetTransfers"
import {
  RequestAssetTransfer,
  RequestAssetTransferApproveSign,
  RequestAssetTransferEth,
  RequestAssetTransferEthHardware,
  ResponseAssetTransfer,
  ResponseAssetTransferEth,
  TransactionStatus,
} from "@core/domains/transactions/types"
import { getPairForAddressSafely } from "@core/handlers/helpers"
import { ExtensionHandler } from "@core/libs/Handler"
import { log } from "@core/log"
import { chaindataProvider } from "@core/rpcs/chaindata"
import type {
  RequestSignatures,
  RequestTypes,
  ResponseType,
  SubscriptionCallback,
} from "@core/types"
import { Address, Port } from "@core/types/base"
import { getPrivateKey } from "@core/util/getPrivateKey"
import { TransactionRequest } from "@ethersproject/abstract-provider"
import { ExtrinsicStatus } from "@polkadot/types/interfaces"
import { assert } from "@polkadot/util"
import * as Sentry from "@sentry/browser"
import { planckToTokens } from "@talismn/util"
import { Wallet, ethers } from "ethers"

import { transferAnalytics } from "./helpers"

export default class AssetTransferHandler extends ExtensionHandler {
  private getExtrinsicWatch(
    chainId: ChainId,
    from: Address,
    resolve: (value: ResponseAssetTransfer | PromiseLike<ResponseAssetTransfer>) => void,
    reject: (reason: any) => void
  ) {
    const watchExtrinsic: SubscriptionCallback<{
      nonce: string
      hash: string
      status: ExtrinsicStatus
    }> = async (error, result) => {
      if (error) return reject(error)
      if (!result) return

      const { nonce, hash, status } = result

      let blockNumber: string | undefined = undefined
      let extrinsicIndex: number | undefined = undefined
      let extrinsicResult: TransactionStatus | undefined = undefined
      if (status && (status.isInBlock || status.isFinalized)) {
        // get tx block and events
        const blockHash = status.isFinalized
          ? status.asFinalized.toString()
          : status.isInBlock
          ? status.asInBlock.toString()
          : false
        if (blockHash === false) return

        const [block, events] = await Promise.all([
          BlocksRpc.block(chainId, blockHash),
          EventsRpc.events(chainId, blockHash),
        ])
        blockNumber = block.header.number.toString()
        extrinsicIndex = block.extrinsics.findIndex(
          (extrinsic) => extrinsic.hash && extrinsic.hash.eq(hash)
        )
        if (extrinsicIndex === -1) return

        // search for ExtrinsicSuccess event
        extrinsicResult =
          events
            .filter((event) => event.phase.isApplyExtrinsic)
            .filter((event) => event.phase.asApplyExtrinsic.eq(extrinsicIndex))
            .filter((event) => event.section === "system")
            .filter((event) => ["ExtrinsicSuccess"].includes(event.method)).length > 0
            ? "SUCCESS"
            : "ERROR"
      }

      const { isCreated, id } = this.stores.transactions.upsert(
        from,
        nonce,
        hash,
        status,
        chainId,
        blockNumber,
        extrinsicIndex,
        extrinsicResult
      )
      if (isCreated) resolve({ id })
    }

    return watchExtrinsic
  }

  private async assetTransfer({
    chainId,
    tokenId,
    fromAddress,
    toAddress,
    amount = "0",
    tip = "0",
    method = "transferKeepAlive",
  }: RequestAssetTransfer) {
    const result = await getPairForAddressSafely(fromAddress, async (pair) => {
      const token = await chaindataProvider.getToken(tokenId)
      if (!token) throw new Error(`Invalid tokenId ${tokenId}`)

      transferAnalytics({ network: { chainId }, amount, tokenId, toAddress })

      return await new Promise<ResponseAssetTransfer>((resolve, reject) => {
        const watchExtrinsic = this.getExtrinsicWatch(chainId, fromAddress, resolve, reject)

        const tokenType = token.type
        if (
          tokenType === "substrate-native" ||
          tokenType === "substrate-orml" ||
          tokenType === "substrate-assets" ||
          tokenType === "substrate-tokens" ||
          tokenType === "substrate-equilibrium"
        )
          return AssetTransfersRpc.transfer(
            chainId,
            tokenId,
            amount,
            pair,
            toAddress,
            tip,
            method,
            watchExtrinsic
          ).catch((err) => {
            log.error("Error sending substrate transaction: ", { err })
            reject(err)
          })
        if (tokenType === "evm-native")
          throw new Error(
            "Evm native token transfers are not implemented in this version of Talisman."
          )
        if (tokenType === "evm-erc20")
          throw new Error("Erc20 token transfers are not implemented in this version of Talisman.")

        // force compilation error if any token types don't have a case
        const exhaustiveCheck: never = tokenType
        throw new Error(`Unhandled token type ${exhaustiveCheck}`)
      })
    })

    if (result.ok) return result.val
    // 1010 (Invalid signature) happens often on kusama, simply retrying usually works.
    // This message should hopefully motivate the user to retry
    else if ((result.val as any)?.code === 1010) throw new Error("Failed to send transaction")
    else if (result.val instanceof Error) throw result.val
    else throw new Error("Failed to send transaction")
  }

  private async assetTransferCheckFees({
    chainId,
    tokenId,
    fromAddress,
    toAddress,
    amount = "0",
    tip = "0",
    method = "transferKeepAlive",
  }: RequestAssetTransfer) {
    const result = await getPairForAddressSafely(fromAddress, async (pair) => {
      const token = await chaindataProvider.getToken(tokenId)
      if (!token) throw new Error(`Invalid tokenId ${tokenId}`)

      const tokenType = token.type
      if (
        tokenType === "substrate-native" ||
        tokenType === "substrate-orml" ||
        tokenType === "substrate-assets" ||
        tokenType === "substrate-tokens" ||
        tokenType === "substrate-equilibrium"
      )
        return await AssetTransfersRpc.checkFee(
          chainId,
          tokenId,
          amount,
          pair,
          toAddress,
          tip,
          method
        )
      if (tokenType === "evm-native")
        throw new Error(
          "Evm native token transfers are not implemented in this version of Talisman."
        )
      if (tokenType === "evm-erc20")
        throw new Error("Erc20 token transfers are not implemented in this version of Talisman.")

      // force compilation error if any token types don't have a case
      const exhaustiveCheck: never = tokenType
      throw new Error(`Unhandled token type ${exhaustiveCheck}`)
    })

    if (result.ok) return result.val
    // 1010 (Invalid signature) happens often on kusama, simply retrying usually works.
    // This message should hopefully motivate the user to retry
    else if ((result.val as any)?.code === 1010) throw new Error("Failed to send transaction")
    else if (result.val instanceof Error) throw result.val
    else throw new Error("Failed to check fees")
  }

  private async assetTransferEthHardware({
    evmNetworkId,
    tokenId,
    amount,
    signedTransaction,
  }: RequestAssetTransferEthHardware): Promise<ResponseAssetTransferEth> {
    try {
      const provider = await getProviderForEvmNetworkId(evmNetworkId)
      if (!provider) throw new Error(`Could not find provider for network ${evmNetworkId}`)

      const token = await chaindataProvider.getToken(tokenId)
      if (!token) throw new Error(`Invalid tokenId ${tokenId}`)

      const { from, to, hash, ...otherDetails } = await provider.sendTransaction(signedTransaction)
      if (!to) throw new Error("Unable to transfer - no recipient address given")

      log.log("assetTransferEth - sent", { from, to, hash, ...otherDetails })

      transferAnalytics({
        network: { evmNetworkId },
        amount: planckToTokens(amount, token.decimals),
        tokenId,
        toAddress: to,
        hardware: true,
      })

      incrementTransactionCount(from, evmNetworkId)

      return { hash }
    } catch (err) {
      const error = err as Error & { reason?: string; error?: Error }
      // eslint-disable-next-line no-console
      DEBUG && console.error(error.message, { err })
      Sentry.captureException(err, { extra: { tokenId, evmNetworkId } })
      throw new Error(error?.error?.message ?? error.reason ?? "Failed to send transaction")
    }
  }

  private async assetTransferEth({
    evmNetworkId,
    tokenId,
    fromAddress,
    toAddress,
    amount,
    gasSettings,
  }: RequestAssetTransferEth): Promise<ResponseAssetTransferEth> {
    const result = await getPairForAddressSafely(fromAddress, async (pair) => {
      const password = this.stores.password.getPassword()
      assert(password, "Unauthorised")

      const token = await chaindataProvider.getToken(tokenId)
      if (!token) throw new Error(`Invalid tokenId ${tokenId}`)

      const provider = await getProviderForEvmNetworkId(evmNetworkId)
      if (!provider) throw new Error(`Could not find provider for network ${evmNetworkId}`)

      transferAnalytics({
        network: { evmNetworkId },
        amount: planckToTokens(amount, token.decimals),
        tokenId,
        toAddress,
      })

      const transfer = await getEthTransferTransactionBase(
        evmNetworkId,
        ethers.utils.getAddress(fromAddress),
        ethers.utils.getAddress(toAddress),
        token,
        amount
      )

      const transaction: TransactionRequest = {
        nonce: await getTransactionCount(fromAddress, evmNetworkId),
        ...rebuildGasSettings(gasSettings),
        ...transfer,
      }

      const privateKey = getPrivateKey(pair, password)
      const wallet = new Wallet(privateKey, provider)

      const response = await wallet.sendTransaction(transaction)

      const { hash, ...otherDetails } = response
      log.log("assetTransferEth - sent", { hash, ...otherDetails })

      incrementTransactionCount(fromAddress, evmNetworkId)

      return { hash }
    })

    if (result.ok) return result.val
    else {
      const error = result.val as Error & { reason?: string; error?: Error }
      log.error("Failed to send transaction", { err: result.val })
      Sentry.captureException(result.val, { tags: { tokenId, evmNetworkId } })
      throw new Error(error?.error?.message ?? error.reason ?? "Failed to send transaction")
    }
  }

  private async assetTransferApproveSign({
    unsigned,
    signature,
  }: RequestAssetTransferApproveSign): Promise<ResponseAssetTransfer> {
    const chain = await chaindataProvider.getChain({ genesisHash: unsigned.genesisHash })
    if (!chain) throw new Error(`Could not find chain for genesisHash ${unsigned.genesisHash}`)

    return new Promise((resolve, reject) => {
      const watchExtrinsic = this.getExtrinsicWatch(chain.id, unsigned.address, resolve, reject)
      return AssetTransfersRpc.transferSigned(unsigned, signature, watchExtrinsic).catch(reject)
    })
  }

  handle<TMessageType extends keyof RequestSignatures>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
    port: Port
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      case "pri(assets.transfer)":
        return this.assetTransfer(request as RequestAssetTransfer)

      case "pri(assets.transfer.checkFees)":
        return this.assetTransferCheckFees(request as RequestAssetTransfer)

      case "pri(assets.transferEthHardware)":
        return this.assetTransferEthHardware(request as RequestAssetTransferEthHardware)

      case "pri(assets.transferEth)":
        return this.assetTransferEth(request as RequestAssetTransferEth)

      case "pri(assets.transfer.approveSign)":
        return this.assetTransferApproveSign(request as RequestAssetTransferApproveSign)

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
