import {
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token"
import { Connection, PublicKey, TransactionInstruction } from "@solana/web3.js"
import { isTokenOfType } from "@talismn/chaindata-provider"

import { IBalanceModule } from "../../types/IBalanceModule"
import { MODULE_TYPE } from "./config"

export const getTransferCallData: IBalanceModule<
  typeof MODULE_TYPE
>["getTransferCallData"] = async ({ from, to, value, token, connector }) => {
  if (!isTokenOfType(token, MODULE_TYPE))
    throw new Error(`Token type ${token.type} is not ${MODULE_TYPE}.`)

  const connection = await connector.getConnection(token.networkId)

  const instructions: TransactionInstruction[] = []

  const mint = new PublicKey(token.mintAddress)
  const fromWallet = new PublicKey(from)
  const toWallet = new PublicKey(to)

  // Get associated token accounts
  const fromTokenAccount = await getAssociatedTokenAddress(mint, fromWallet)
  const toTokenAccount = await getAssociatedTokenAddress(mint, toWallet)

  // Create the target token account if it doesn't exist
  if (!(await tokenAccountExists(connection, toTokenAccount))) {
    instructions.push(
      createAssociatedTokenAccountInstruction(
        fromWallet, // funder
        toTokenAccount,
        toWallet,
        mint,
      ),
    )
  }

  // Transfer the tokens
  instructions.push(
    createTransferInstruction(
      fromTokenAccount,
      toTokenAccount,
      fromWallet,
      BigInt(value),
      [],
      TOKEN_PROGRAM_ID,
    ),
  )

  return instructions
}

const tokenAccountExists = async (connection: Connection, address: PublicKey) => {
  try {
    await getAccount(connection, address)
    return true
  } catch {
    return false
  }
}
