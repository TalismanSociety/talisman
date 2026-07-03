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
import { isOnCurveSolanaAddress } from "@talismn/crypto"

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

    // off-curve (program-derived) recipients get an ATA no private key can control — tokens
    // sent there are unrecoverable by a regular wallet (spl-token's getAssociatedTokenAddress
    // enforced this; findAssociatedTokenPda does not)
    if (!isOnCurveSolanaAddress(to))
      throw new Error("Transfers to program-derived (off-curve) addresses are not supported.")

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
    if (!(await tokenAccountExists(rpc, toTokenAccount, TOKEN_PROGRAM_ADDRESS))) {
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

const tokenAccountExists = async (rpc: SolRpc, address: Address, tokenProgram: Address) => {
  // encoding must be explicit: the node rejects base58 (its default) for account data >128 bytes,
  // and the owner check is enough — skip the data entirely. An account not owned by the token
  // program (e.g. a rent-dusted system account squatting the ATA address) must go through the
  // create instruction, which handles pre-funded addresses; a bare transfer to it fails on-chain.
  const { value } = await rpc
    .getAccountInfo(address, { encoding: "base64", dataSlice: { offset: 0, length: 0 } })
    .send()
  return value !== null && value.owner === tokenProgram
}
