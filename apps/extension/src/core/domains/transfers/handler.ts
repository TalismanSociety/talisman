import { DEBUG } from "@core/constants"
import { getEthTransferTransactionBase, rebuildGasSettings } from "@core/domains/ethereum/helpers"
import { getProviderForEvmNetworkId } from "@core/domains/ethereum/rpcProviders"
import {
  getTransactionCount,
  incrementTransactionCount,
} from "@core/domains/ethereum/transactionCountManager"
import AssetTransfersRpc from "@core/domains/transfers/rpc/AssetTransfers"
import {
  RequestAssetTransfer,
  RequestAssetTransferApproveSign,
  RequestAssetTransferEth,
  RequestAssetTransferEthHardware,
  ResponseAssetTransfer,
} from "@core/domains/transfers/types"
import { getPairForAddressSafely, getPairFromAddress } from "@core/handlers/helpers"
import { ExtensionHandler } from "@core/libs/Handler"
import { log } from "@core/log"
import { watchEthereumTransaction } from "@core/notifications"
import { chaindataProvider } from "@core/rpcs/chaindata"
import type { RequestSignatures, RequestTypes, ResponseType } from "@core/types"
import { Port } from "@core/types/base"
import { getPrivateKey } from "@core/util/getPrivateKey"
import { TransactionRequest } from "@ethersproject/abstract-provider"
import { assert } from "@polkadot/util"
import { HexString } from "@polkadot/util/types"
import * as Sentry from "@sentry/browser"
import { planckToTokens, tokensToPlanck } from "@talismn/util"
import { Wallet, ethers } from "ethers"

import { transferAnalytics } from "./helpers"

export default class AssetTransferHandler extends ExtensionHandler {
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

      const tokenType = token.type
      if (
        tokenType === "substrate-native" ||
        tokenType === "substrate-orml" ||
        tokenType === "substrate-assets" ||
        tokenType === "substrate-tokens" ||
        tokenType === "substrate-equilibrium"
      ) {
        try {
          const hash = await AssetTransfersRpc.transfer(
            chainId,
            tokenId,
            amount,
            pair,
            toAddress,
            tip,
            method
          )
          return { hash } as ResponseAssetTransfer
        } catch (err) {
          log.error("Error sending substrate transaction: ", { err })
          throw err
        }
      }
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
    const token = await chaindataProvider.getToken(tokenId)
    if (!token) throw new Error(`Invalid tokenId ${tokenId}`)

    const tokenType = token.type
    if (
      tokenType === "substrate-native" ||
      tokenType === "substrate-orml" ||
      tokenType === "substrate-assets" ||
      tokenType === "substrate-tokens" ||
      tokenType === "substrate-equilibrium"
    ) {
      const pair = getPairFromAddress(fromAddress) // no need for an unlocked pair for fee estimation
      return AssetTransfersRpc.checkFee(chainId, tokenId, amount, pair, toAddress, tip, method)
    }

    if (tokenType === "evm-native")
      throw new Error("Evm native token transfers are not implemented in this version of Talisman.")
    if (tokenType === "evm-erc20")
      throw new Error("Erc20 token transfers are not implemented in this version of Talisman.")

    // force compilation error if any token types don't have a case
    const exhaustiveCheck: never = tokenType
    throw new Error(`Unhandled token type ${exhaustiveCheck}`)
  }

  private async assetTransferEthHardware({
    evmNetworkId,
    tokenId,
    amount,
    to,
    unsigned,
    signedTransaction,
  }: RequestAssetTransferEthHardware): Promise<ResponseAssetTransfer> {
    try {
      const provider = await getProviderForEvmNetworkId(evmNetworkId)
      if (!provider) throw new Error(`Could not find provider for network ${evmNetworkId}`)

      const token = await chaindataProvider.getToken(tokenId)
      if (!token) throw new Error(`Invalid tokenId ${tokenId}`)

      const { from, to, hash, ...otherDetails } = await provider.sendTransaction(signedTransaction)
      if (!to) throw new Error("Unable to transfer - no recipient address given")

      watchEthereumTransaction(evmNetworkId, hash, unsigned, {
        transferInfo: { tokenId: token.id, value: amount, to },
      })

      transferAnalytics({
        network: { evmNetworkId },
        amount: planckToTokens(amount, token.decimals),
        tokenId,
        toAddress: to,
        hardware: true,
      })

      incrementTransactionCount(from, evmNetworkId)

      return { hash } as { hash: HexString }
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
  }: RequestAssetTransferEth): Promise<ResponseAssetTransfer> {
    const token = await chaindataProvider.getToken(tokenId)
    if (!token) throw new Error(`Invalid tokenId ${tokenId}`)

    const provider = await getProviderForEvmNetworkId(evmNetworkId)
    if (!provider) throw new Error(`Could not find provider for network ${evmNetworkId}`)

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

    const result = await getPairForAddressSafely(fromAddress, async (pair) => {
      const password = this.stores.password.getPassword()
      assert(password, "Unauthorised")

      const privateKey = getPrivateKey(pair, password)
      const wallet = new Wallet(privateKey, provider)

      const { hash } = await wallet.sendTransaction(transaction)

      incrementTransactionCount(fromAddress, evmNetworkId)

      return { hash } as { hash: HexString }
    })

    if (result.ok) {
      watchEthereumTransaction(evmNetworkId, result.val.hash, transaction, {
        transferInfo: { tokenId: token.id, value: amount, to: toAddress },
      })

      transferAnalytics({
        network: { evmNetworkId },
        amount: planckToTokens(amount, token.decimals),
        tokenId,
        toAddress,
      })

      return result.val
    } else {
      const error = result.val as Error & { reason?: string; error?: Error }
      log.error("Failed to send transaction", { err: result.val })
      Sentry.captureException(result.val, { tags: { tokenId, evmNetworkId } })
      throw new Error(error?.error?.message ?? error.reason ?? "Failed to send transaction")
    }
  }

  private async assetTransferApproveSign({
    unsigned,
    signature,
    transferInfo,
  }: RequestAssetTransferApproveSign): Promise<ResponseAssetTransfer> {
    const chain = await chaindataProvider.getChain({ genesisHash: unsigned.genesisHash })
    if (!chain) throw new Error(`Could not find chain for genesisHash ${unsigned.genesisHash}`)

    const hash = await AssetTransfersRpc.transferSigned(unsigned, signature, transferInfo)
    return { hash }
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
