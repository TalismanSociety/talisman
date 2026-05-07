import {
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  createTransferCheckedWithFeeAndTransferHookInstruction,
  createTransferCheckedWithFeeInstruction,
  createTransferCheckedWithTransferHookInstruction,
  getAccount,
  getAssociatedTokenAddress,
  getMint,
  getNonTransferable,
  getTransferFeeConfig,
  getTransferHook,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token"
import { type Connection, PublicKey, type TransactionInstruction } from "@solana/web3.js"
import { isTokenOfType } from "@talismn/chaindata-provider"

import type { IBalanceModule } from "../../types/IBalanceModule"
import { MODULE_TYPE } from "./config"

export const getTransferCallData: IBalanceModule<typeof MODULE_TYPE>["getTransferCallData"] =
  async ({ from, to, value, token, connector }) => {
    if (!isTokenOfType(token, MODULE_TYPE))
      throw new Error(`Token type ${token.type} is not ${MODULE_TYPE}.`)

    const connection = await connector.getConnection(token.networkId)

    const mintPubkey = new PublicKey(token.mintAddress)
    const fromWallet = new PublicKey(from)
    const toWallet = new PublicKey(to)

    // Fetch the mint account to detect extensions
    const mintAccount = await getMint(connection, mintPubkey, undefined, TOKEN_2022_PROGRAM_ID)

    // Block non-transferable tokens
    const nonTransferable = getNonTransferable(mintAccount)
    if (nonTransferable) throw new Error("This token is non-transferable.")

    const transferFeeConfig = getTransferFeeConfig(mintAccount)
    const transferHook = getTransferHook(mintAccount)

    const instructions: TransactionInstruction[] = []

    // Token 2022 ATAs use the same ATA program but with TOKEN_2022_PROGRAM_ID as the programId seed
    const fromTokenAccount = await getAssociatedTokenAddress(
      mintPubkey,
      fromWallet,
      false,
      TOKEN_2022_PROGRAM_ID
    )
    const toTokenAccount = await getAssociatedTokenAddress(
      mintPubkey,
      toWallet,
      false,
      TOKEN_2022_PROGRAM_ID
    )

    // Create the target token account if it doesn't exist
    if (!(await tokenAccountExists(connection, toTokenAccount))) {
      instructions.push(
        createAssociatedTokenAccountInstruction(
          fromWallet,
          toTokenAccount,
          toWallet,
          mintPubkey,
          TOKEN_2022_PROGRAM_ID
        )
      )
    }

    const amount = BigInt(value)

    if (transferFeeConfig && transferHook) {
      // Both transfer fee AND transfer hook — use the combined instruction
      instructions.push(
        await createTransferCheckedWithFeeAndTransferHookInstruction(
          connection,
          fromTokenAccount,
          mintPubkey,
          toTokenAccount,
          fromWallet,
          amount,
          token.decimals,
          calculateTransferFee(transferFeeConfig, amount),
          [],
          undefined,
          TOKEN_2022_PROGRAM_ID
        )
      )
    } else if (transferFeeConfig) {
      // Transfer fee only — fee must be exact or the transaction fails
      instructions.push(
        createTransferCheckedWithFeeInstruction(
          fromTokenAccount,
          mintPubkey,
          toTokenAccount,
          fromWallet,
          amount,
          token.decimals,
          calculateTransferFee(transferFeeConfig, amount),
          [],
          TOKEN_2022_PROGRAM_ID
        )
      )
    } else if (transferHook) {
      // Transfer hook only — resolves extra accounts asynchronously
      instructions.push(
        await createTransferCheckedWithTransferHookInstruction(
          connection,
          fromTokenAccount,
          mintPubkey,
          toTokenAccount,
          fromWallet,
          amount,
          token.decimals,
          [],
          undefined,
          TOKEN_2022_PROGRAM_ID
        )
      )
    } else {
      // Standard Token 2022 transfer (no special extensions)
      instructions.push(
        createTransferCheckedInstruction(
          fromTokenAccount,
          mintPubkey,
          toTokenAccount,
          fromWallet,
          amount,
          token.decimals,
          [],
          TOKEN_2022_PROGRAM_ID
        )
      )
    }

    return instructions
  }

const tokenAccountExists = async (connection: Connection, address: PublicKey) => {
  try {
    await getAccount(connection, address, undefined, TOKEN_2022_PROGRAM_ID)
    return true
  } catch {
    return false
  }
}

/**
 * Calculates the transfer fee for a given amount using the current epoch's fee configuration.
 * The fee is capped at the maximum fee defined in the config.
 */
// biome-ignore lint/suspicious/noExplicitAny: TransferFeeConfig type from @solana/spl-token has complex internal structure
const calculateTransferFee = (transferFeeConfig: any, amount: bigint): bigint => {
  const epoch = transferFeeConfig.newerTransferFee ?? transferFeeConfig.olderTransferFee
  if (!epoch) return 0n

  const basisPoints = BigInt(epoch.transferFeeBasisPoints)
  const maxFee = BigInt(epoch.maximumFee)

  const fee = (amount * basisPoints) / 10000n
  return fee > maxFee ? maxFee : fee
}
