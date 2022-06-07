import type {
  Port,
  RequestAssetTransfer,
  RequestSignatures,
  SubscriptionCallback,
  RequestTypes,
  ResponseAssetTransfer,
  ResponseAssetTransferFeeQuery,
  ResponseType,
  TransactionStatus,
  RequestAssetTransferApproveSign,
  ChainId,
  Address,
} from "@core/types"
import { ExtensionHandler } from "@core/libs/Handler"
import { getPairFromAddress, getUnlockedPairFromAddress } from "@core/handlers/helpers"
import { tokenStore } from "@core/domains/tokens"
import BlocksRpc from "@core/libs/rpc/Blocks"
import EventsRpc from "@core/libs/rpc/Events"
import AssetTransfersRpc from "@core/libs/rpc/AssetTransfers"
import OrmlTokenTransfersRpc from "@core/libs/rpc/OrmlTokenTransfers"
import { ExtrinsicStatus } from "@polkadot/types/interfaces"
import { pendingTransfers } from "@core/libs/rpc/PendingTransfers"

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
      if (status.isFinalized) {
        // get tx block and events
        const blockHash = status.asFinalized.toString()
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
      var pair = getUnlockedPairFromAddress(fromAddress)
    } catch (error) {
      this.stores.password.clearPassword()
      throw error
    }

    const token = await tokenStore.token(tokenId)
    if (!token) throw new Error(`Invalid tokenId ${tokenId}`)

    return await new Promise((resolve, reject) => {
      const watchExtrinsic = this.getExtrinsicWatch(chainId, fromAddress, resolve, reject)

      const tokenType = token.type
      if (tokenType === "native")
        return AssetTransfersRpc.transfer(
          chainId,
          amount,
          pair,
          toAddress,
          tip,
          reapBalance,
          watchExtrinsic
        )
      if (tokenType === "orml")
        return OrmlTokenTransfersRpc.transfer(
          chainId,
          tokenId,
          amount,
          pair,
          toAddress,
          tip,
          watchExtrinsic
        )

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
    try {
      // no need for this pair to be unlocked, as we will use a fake signature
      var pair = getPairFromAddress(fromAddress)
    } catch (error) {
      throw error
    }

    const token = await tokenStore.token(tokenId)
    if (!token) throw new Error(`Invalid tokenId ${tokenId}`)

    const tokenType = token.type
    if (tokenType === "native")
      return await AssetTransfersRpc.checkFee(chainId, amount, pair, toAddress, tip, reapBalance)
    if (tokenType === "orml")
      return await OrmlTokenTransfersRpc.checkFee(chainId, tokenId, amount, pair, toAddress, tip)

    // force compilation error if any token types don't have a case
    const exhaustiveCheck: never = tokenType
    throw new Error(`Unhandled token type ${exhaustiveCheck}`)
  }

  private async assetTransferApproveSign({
    id,
    signature,
  }: RequestAssetTransferApproveSign): Promise<ResponseAssetTransfer> {
    const { chainId, unsigned } = pendingTransfers.get(id)!

    return await new Promise((resolve, reject) => {
      const watchExtrinsic = this.getExtrinsicWatch(chainId, unsigned.address, resolve, reject)
      pendingTransfers.transfer(id, signature, watchExtrinsic)
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
