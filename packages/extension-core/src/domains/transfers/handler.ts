import { assert } from "@polkadot/util"
import { isEthereumAddress, planckToTokens } from "@talismn/util"
import { log } from "extension-shared"
import { privateKeyToAccount } from "viem/accounts"

import { sentry } from "../../config/sentry"
import { getPairForAddressSafely, getPairFromAddress } from "../../handlers/helpers"
import { ExtensionHandler } from "../../libs/Handler"
import { chainConnectorEvm } from "../../rpcs/chain-connector-evm"
import { chaindataProvider } from "../../rpcs/chaindata"
import type { RequestSignatures, RequestTypes, ResponseType } from "../../types"
import { Port } from "../../types/base"
import { getPrivateKey } from "../../util/getPrivateKey"
import { validateHexString } from "../../util/validateHexString"
import {
  getEthTransferTransactionBase,
  parseGasSettings,
  prepareTransaction,
} from "../ethereum/helpers"
import { serializeTransactionRequest } from "../ethereum/helpers"
import { getTransactionCount, incrementTransactionCount } from "../ethereum/transactionCountManager"
import { watchEthereumTransaction } from "../transactions"
import { transferAnalytics } from "./helpers"
import AssetTransfersRpc from "./rpc/AssetTransfers"
import {
  RequestAssetTransfer,
  RequestAssetTransferApproveSign,
  RequestAssetTransferEth,
  RequestAssetTransferEthHardware,
  ResponseAssetTransfer,
} from "./types"

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
      const token = await chaindataProvider.tokenById(tokenId)
      if (!token) throw new Error(`Invalid tokenId ${tokenId}`)

      transferAnalytics({ network: { chainId }, amount, tokenId, toAddress })

      const tokenType = token.type
      if (
        tokenType === "substrate-native" ||
        tokenType === "substrate-assets" ||
        tokenType === "substrate-tokens" ||
        tokenType === "substrate-psp22" ||
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
      if (tokenType === "evm-uniswapv2")
        throw new Error(
          "Uniswap V2 token transfers are not implemented in this version of Talisman."
        )

      // force compilation error if any token types don't have a case
      const exhaustiveCheck: never = tokenType
      throw new Error(`Unhandled token type ${exhaustiveCheck}`)
    })

    if (result.ok) return result.val
    else {
      // We were previously replacing all errors with code 1010 with a generic "Failed to send"
      // However 1010 means error code from RPC, message that goes along with it (err.data) can be meaningful
      const error = result.val as Error & { code?: number; data?: string }

      // display message from RPC, if any
      if (typeof error?.data === "string") throw new Error(error.data)
      else if (error instanceof Error) throw error
      else throw new Error("Failed to send transaction")
    }
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
    const token = await chaindataProvider.tokenById(tokenId)
    if (!token) throw new Error(`Invalid tokenId ${tokenId}`)

    const tokenType = token.type
    if (
      tokenType === "substrate-native" ||
      tokenType === "substrate-assets" ||
      tokenType === "substrate-tokens" ||
      tokenType === "substrate-psp22" ||
      tokenType === "substrate-equilibrium"
    ) {
      const pair = getPairFromAddress(fromAddress) // no need for an unlocked pair for fee estimation
      try {
        return await AssetTransfersRpc.checkFee(
          chainId,
          tokenId,
          amount,
          pair,
          toAddress,
          tip,
          method
        )
      } catch (error) {
        log.error("Error checking substrate transaction fees: ", { cause: error })
        throw new Error("Unable to estimate fees")
      }
    }

    if (tokenType === "evm-native")
      throw new Error("Evm native token transfers are not implemented in this version of Talisman.")
    if (tokenType === "evm-erc20")
      throw new Error("Erc20 token transfers are not implemented in this version of Talisman.")
    if (tokenType === "evm-uniswapv2")
      throw new Error("Uniswap V2 token transfers are not implemented in this version of Talisman.")

    // force compilation error if any token types don't have a case
    const exhaustiveCheck: never = tokenType
    throw new Error(`Unhandled token type ${exhaustiveCheck}`)
  }

  private async assetTransferEthHardware({
    evmNetworkId,
    tokenId,
    amount,
    unsigned,
    signedTransaction,
  }: RequestAssetTransferEthHardware): Promise<ResponseAssetTransfer> {
    try {
      const client = await chainConnectorEvm.getPublicClientForEvmNetwork(evmNetworkId)
      if (!client) throw new Error(`Could not find provider for network ${evmNetworkId}`)

      const token = await chaindataProvider.tokenById(tokenId)
      if (!token) throw new Error(`Invalid tokenId ${tokenId}`)

      const { from, to } = unsigned
      if (!from) throw new Error("Unable to transfer - no from address specified")
      if (!to) throw new Error("Unable to transfer - no recipient address specified")

      const hash = await client?.sendRawTransaction({
        serializedTransaction: signedTransaction,
      })
      if (!hash) throw new Error("Failed to submit - no hash returned")

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

      return { hash }
    } catch (err) {
      const error = err as Error & { reason?: string; error?: Error }
      log.error(error.message, { err })
      sentry.captureException(err, { extra: { tokenId, evmNetworkId } })
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
    const token = await chaindataProvider.tokenById(tokenId)
    if (!token) throw new Error(`Invalid tokenId ${tokenId}`)

    assert(isEthereumAddress(fromAddress), "Invalid from address")
    assert(isEthereumAddress(toAddress), "Invalid to address")

    const transfer = await getEthTransferTransactionBase(
      evmNetworkId,
      fromAddress,
      toAddress,
      token,
      BigInt(amount ?? 0)
    )

    const parsedGasSettings = parseGasSettings(gasSettings)
    const nonce = await getTransactionCount(fromAddress, evmNetworkId)

    const transaction = prepareTransaction(transfer, parsedGasSettings, nonce)
    const unsigned = serializeTransactionRequest(transaction)

    const result = await getPairForAddressSafely(fromAddress, async (pair) => {
      const client = await chainConnectorEvm.getWalletClientForEvmNetwork(evmNetworkId)
      assert(client, "Missing client for chain " + evmNetworkId)

      const password = await this.stores.password.getPassword()
      assert(password, "Unauthorised")

      const privateKey = getPrivateKey(pair, password, "hex")
      const account = privateKeyToAccount(privateKey)

      const hash = await client.sendTransaction({
        chain: client.chain,
        account,
        ...transaction,
      })

      incrementTransactionCount(fromAddress, evmNetworkId)

      return { hash }
    })

    if (result.ok) {
      // TODO test this
      watchEthereumTransaction(evmNetworkId, result.val.hash, unsigned, {
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
      sentry.captureException(result.val, { tags: { tokenId, evmNetworkId } })
      throw new Error(error?.error?.message ?? error.reason ?? "Failed to send transaction")
    }
  }

  private async assetTransferApproveSign({
    unsigned,
    signature,
    transferInfo,
  }: RequestAssetTransferApproveSign): Promise<ResponseAssetTransfer> {
    const genesisHash = validateHexString(unsigned.genesisHash)
    const chain = await chaindataProvider.chainByGenesisHash(genesisHash)
    if (!chain) throw new Error(`Could not find chain for genesisHash ${genesisHash}`)

    const hash = await AssetTransfersRpc.transferSigned(unsigned, signature, transferInfo)
    return { hash }
  }

  handle<TMessageType extends keyof RequestSignatures>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
