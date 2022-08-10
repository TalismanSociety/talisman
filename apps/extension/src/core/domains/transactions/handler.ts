import BlocksRpc from "@core/domains/blocks/rpc"
import { ChainId } from "@core/domains/chains/types"
import EventsRpc from "@core/domains/events/rpc"
import AssetTransfersRpc from "@core/domains/transactions/rpc/AssetTransfers"
import OrmlTokenTransfersRpc from "@core/domains/transactions/rpc/OrmlTokenTransfers"
import { pendingTransfers } from "@core/domains/transactions/rpc/PendingTransfers"
import {
  RequestAssetTransfer,
  RequestAssetTransferApproveSign,
  ResponseAssetTransfer,
  ResponseAssetTransferFeeQuery,
  TransactionStatus,
} from "@core/domains/transactions/types"
import { getPairFromAddress, getUnlockedPairFromAddress } from "@core/handlers/helpers"
import { talismanAnalytics } from "@core/libs/Analytics"
import { db } from "@core/libs/db"
import { ExtensionHandler } from "@core/libs/Handler"
import type {
  RequestSignatures,
  RequestTypes,
  ResponseType,
  SubscriptionCallback,
} from "@core/types"
import { Address, Port } from "@core/types/base"
import { roundToFirstInteger } from "@core/util/roundToFirstInteger"
import { ExtrinsicStatus } from "@polkadot/types/interfaces"
import keyring from "@polkadot/ui-keyring"
import { assert } from "@polkadot/util"
import BigNumber from "bignumber.js"

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

        // search for ExtrinsicSuccess event
        extrinsicResult =
          typeof extrinsicIndex === "number" &&
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
    amount,
    tip,
    reapBalance = false,
  }: RequestAssetTransfer): Promise<ResponseAssetTransfer> {
    try {
      // eslint-disable-next-line no-var
      var pair = getUnlockedPairFromAddress(fromAddress)
    } catch (error) {
      this.stores.password.clearPassword()
      throw error
    }

    const token = await db.tokens.get(tokenId)
    if (!token) throw new Error(`Invalid tokenId ${tokenId}`)

    talismanAnalytics.capture("asset transfer", {
      chainId,
      tokenId,
      amount: roundToFirstInteger(new BigNumber(amount).toNumber()),
      internal: keyring.getAccount(toAddress) !== undefined,
    })

    return await new Promise((resolve, reject) => {
      const watchExtrinsic = this.getExtrinsicWatch(chainId, fromAddress, resolve, reject)

      const tokenType = token.type
      if (tokenType === "substrate-native")
        return AssetTransfersRpc.transfer(
          chainId,
          amount,
          pair,
          toAddress,
          tip,
          reapBalance,
          watchExtrinsic
        )
      if (tokenType === "substrate-orml")
        return OrmlTokenTransfersRpc.transfer(
          chainId,
          tokenId,
          amount,
          pair,
          toAddress,
          tip,
          watchExtrinsic
        )
      if (tokenType === "evm-erc20")
        throw new Error("Erc20 token transfers are not implemented in this version of Talisman.")

      // force compilation error if any token types don't have a case
      const exhaustiveCheck: never = tokenType
      throw new Error(`Unhandled token type ${exhaustiveCheck}`)
    })
  }

  private async assetTransferCheckFees({
    chainId,
    tokenId,
    fromAddress,
    toAddress,
    amount,
    tip,
    reapBalance = false,
  }: RequestAssetTransfer): Promise<ResponseAssetTransferFeeQuery> {
    const pair = getPairFromAddress(fromAddress)

    const token = await db.tokens.get(tokenId)
    if (!token) throw new Error(`Invalid tokenId ${tokenId}`)

    const tokenType = token.type
    if (tokenType === "substrate-native")
      return await AssetTransfersRpc.checkFee(chainId, amount, pair, toAddress, tip, reapBalance)
    if (tokenType === "substrate-orml")
      return await OrmlTokenTransfersRpc.checkFee(chainId, tokenId, amount, pair, toAddress, tip)
    if (tokenType === "evm-erc20")
      throw new Error("Erc20 token transfers are not implemented in this version of Talisman.")

    // force compilation error if any token types don't have a case
    const exhaustiveCheck: never = tokenType
    throw new Error(`Unhandled token type ${exhaustiveCheck}`)
  }

  private async assetTransferApproveSign({
    id,
    signature,
  }: RequestAssetTransferApproveSign): Promise<ResponseAssetTransfer> {
    const pendingTx = pendingTransfers.get(id)
    assert(pendingTx, `No pending transfer with id ${id}`)
    const { data, transfer } = pendingTx

    return await new Promise((resolve, reject) => {
      const watchExtrinsic = this.getExtrinsicWatch(
        data.chainId,
        data.unsigned.address,
        resolve,
        reject
      )
      transfer(signature, watchExtrinsic)
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

      case "pri(assets.transfer.approveSign)":
        return this.assetTransferApproveSign(request as RequestAssetTransferApproveSign)

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
