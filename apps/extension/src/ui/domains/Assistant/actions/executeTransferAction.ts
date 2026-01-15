import { api } from "@ui/api"
import { getTokensMap$ } from "@ui/state"
import { getAccountByAddress$ } from "@ui/state/accounts"
import {
  getEthTransferTransactionBase,
  serializeTransactionRequest,
  type WalletTransactionInfo,
} from "extension-core"
import { firstValueFrom } from "rxjs"

import type { PendingAction } from "../types"
import type { ExecutionResult, TransferActionParams } from "./types"

const HARDWARE_WALLET_TYPES = ["ledger-ethereum", "ledger-polkadot", "ledger-solana", "qr"]

export const executeTransferAction = async (action: PendingAction): Promise<ExecutionResult> => {
  const params = action.params as TransferActionParams
  const { txData } = params

  if (!txData) {
    return {
      success: false,
      error: "Missing transaction data. Please try again.",
    }
  }

  // Get the account to check if it's a hardware wallet
  const account = await firstValueFrom(getAccountByAddress$(txData.from))

  if (!account) {
    return {
      success: false,
      error: "Account not found. Please try again.",
    }
  }

  // Check for hardware wallet
  if (HARDWARE_WALLET_TYPES.includes(account.type)) {
    return {
      success: false,
      error:
        "Hardware wallet detected. Please use the main wallet interface to sign transactions with your hardware wallet.",
    }
  }

  try {
    switch (txData.platform) {
      case "ethereum":
        return await executeEvmTransfer(txData, account)
      case "polkadot":
        return await executeSubstrateTransfer(txData, account)
      case "solana":
        return await executeSolanaTransfer(txData, account)
      default:
        return {
          success: false,
          error: `Unsupported platform: ${txData.platform}`,
        }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Transaction failed",
    }
  }
}

async function executeEvmTransfer(
  txData: TransferActionParams["txData"],
  // biome-ignore lint/suspicious/noExplicitAny: account type from extension-core
  _account: any
): Promise<ExecutionResult> {
  // Get token info
  const tokensMap = await firstValueFrom(getTokensMap$())
  const token = tokensMap[txData.tokenId]

  if (!token) {
    return {
      success: false,
      error: "Token not found",
    }
  }

  // Build the transaction
  const tx = getEthTransferTransactionBase(
    txData.networkId,
    txData.from as `0x${string}`,
    txData.to as `0x${string}`,
    token,
    BigInt(txData.planck)
  )

  // Serialize the transaction
  const serialized = serializeTransactionRequest(tx)
  if (!serialized) {
    return {
      success: false,
      error: "Failed to serialize transaction",
    }
  }

  // Build transaction info for tracking
  const txInfo: WalletTransactionInfo = {
    type: "transfer",
    tokenId: txData.tokenId,
    value: txData.planck,
    to: txData.to,
  }

  // Sign and send
  const hash = await api.ethSignAndSend(txData.networkId, serialized, txInfo)

  return {
    success: true,
    hash,
  }
}

async function executeSubstrateTransfer(
  _txData: TransferActionParams["txData"],
  // biome-ignore lint/suspicious/noExplicitAny: account type from extension-core
  _account: any
): Promise<ExecutionResult> {
  // For Substrate transfers, we need to use the SAPI (ScaleApi) system
  // This is more complex and requires building the extrinsic payload
  // For now, return an error indicating this needs the main UI

  return {
    success: false,
    error:
      "Substrate transfers require the main wallet interface. Please use the Send function in the wallet UI.",
  }
}

async function executeSolanaTransfer(
  _txData: TransferActionParams["txData"],
  // biome-ignore lint/suspicious/noExplicitAny: account type from extension-core
  _account: any
): Promise<ExecutionResult> {
  // Solana transfers also require more complex setup
  // For now, return an error indicating this needs the main UI

  return {
    success: false,
    error:
      "Solana transfers require the main wallet interface. Please use the Send function in the wallet UI.",
  }
}
