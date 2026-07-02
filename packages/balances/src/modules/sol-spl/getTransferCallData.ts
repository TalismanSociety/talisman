import type { Address, Instruction } from "@solana/kit"
import { createNoopSigner, address as solAddress } from "@solana/kit"
import {
  findAssociatedTokenPda,
  getCreateAssociatedTokenInstruction,
  getTransferInstruction,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token"
import type { SolRpc } from "@talismn/chain-connectors"
import { isTokenOfType } from "@talismn/chaindata-provider"

import type { IBalanceModule } from "../../types/IBalanceModule"
import { MODULE_TYPE } from "./config"

export const getTransferCallData: IBalanceModule<typeof MODULE_TYPE>["getTransferCallData"] =
  async ({ from, to, value, token, connector }) => {
    if (!isTokenOfType(token, MODULE_TYPE))
      throw new Error(`Token type ${token.type} is not ${MODULE_TYPE}.`)

    const rpc = await connector.getRpc(token.networkId)

    const instructions: Instruction[] = []

    const mint = solAddress(token.mintAddress)
    const fromWallet = solAddress(from)
    const toWallet = solAddress(to)

    // Get associated token accounts
    const [fromTokenAccount] = await findAssociatedTokenPda({
      mint,
      owner: fromWallet,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
    })
    const [toTokenAccount] = await findAssociatedTokenPda({
      mint,
      owner: toWallet,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
    })

    // Create the target token account if it doesn't exist
    if (!(await tokenAccountExists(rpc, toTokenAccount))) {
      instructions.push(
        getCreateAssociatedTokenInstruction({
          payer: createNoopSigner(fromWallet), // funder — signature is provided at signing time
          ata: toTokenAccount,
          owner: toWallet,
          mint,
        })
      )
    }

    // Transfer the tokens
    instructions.push(
      getTransferInstruction({
        source: fromTokenAccount,
        destination: toTokenAccount,
        authority: fromWallet,
        amount: BigInt(value),
      })
    )

    return instructions
  }

const tokenAccountExists = async (rpc: SolRpc, address: Address) => {
  const { value } = await rpc.getAccountInfo(address).send()
  return value !== null
}
