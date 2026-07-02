import type { Address, Instruction } from "@solana/kit"
import { createNoopSigner, address as solAddress } from "@solana/kit"
import { findAssociatedTokenPda, getCreateAssociatedTokenInstruction } from "@solana-program/token"
import type { TransferFee } from "@solana-program/token-2022"
import {
  fetchMint,
  getTransferCheckedInstruction,
  getTransferCheckedWithFeeInstruction,
  TOKEN_2022_PROGRAM_ADDRESS,
} from "@solana-program/token-2022"
import type { SolRpc } from "@talismn/chain-connectors"
import { isTokenOfType } from "@talismn/chaindata-provider"

import type { IBalanceModule } from "../../types/IBalanceModule"
import { MODULE_TYPE } from "./config"
import { getTransferFeeConfig, getTransferHook, isNonTransferable } from "./mintExtensions"
import { addExtraAccountMetasForTransferHook } from "./transferHook"

export const getTransferCallData: IBalanceModule<typeof MODULE_TYPE>["getTransferCallData"] =
  async ({ from, to, value, token, connector }) => {
    if (!isTokenOfType(token, MODULE_TYPE))
      throw new Error(`Token type ${token.type} is not ${MODULE_TYPE}.`)

    const rpc = await connector.getRpc(token.networkId)

    const mint = solAddress(token.mintAddress)
    const fromWallet = solAddress(from)
    const toWallet = solAddress(to)

    // Fetch the mint account to detect extensions
    const mintAccount = await fetchMint(rpc, mint)

    // Block non-transferable tokens
    if (isNonTransferable(mintAccount.data)) throw new Error("This token is non-transferable.")

    const transferFeeConfig = getTransferFeeConfig(mintAccount.data)
    const transferHook = getTransferHook(mintAccount.data)

    const instructions: Instruction[] = []

    // Token 2022 ATAs use the same ATA program but with the token-2022 program as the programId seed
    const [fromTokenAccount] = await findAssociatedTokenPda({
      mint,
      owner: fromWallet,
      tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
    })
    const [toTokenAccount] = await findAssociatedTokenPda({
      mint,
      owner: toWallet,
      tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
    })

    // Create the target token account if it doesn't exist
    if (!(await tokenAccountExists(rpc, toTokenAccount))) {
      instructions.push(
        getCreateAssociatedTokenInstruction({
          payer: createNoopSigner(fromWallet), // signature is provided at signing time, not at instruction build time
          ata: toTokenAccount,
          owner: toWallet,
          mint,
          tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
        })
      )
    }

    const amount = BigInt(value)

    const transferInstruction = transferFeeConfig
      ? getTransferCheckedWithFeeInstruction({
          source: fromTokenAccount,
          mint,
          destination: toTokenAccount,
          authority: fromWallet,
          amount,
          decimals: token.decimals,
          // fee must be exact or the transaction fails
          fee: await calculateCurrentEpochTransferFee(rpc, transferFeeConfig, amount),
        })
      : getTransferCheckedInstruction({
          source: fromTokenAccount,
          mint,
          destination: toTokenAccount,
          authority: fromWallet,
          amount,
          decimals: token.decimals,
        })

    instructions.push(
      transferHook
        ? // Transfer hook — resolves and appends the hook's extra accounts
          await addExtraAccountMetasForTransferHook({
            rpc,
            instruction: transferInstruction,
            hookProgramId: transferHook.programId,
            source: fromTokenAccount,
            mint,
            destination: toTokenAccount,
            authority: fromWallet,
            amount,
          })
        : transferInstruction
    )

    return instructions
  }

const tokenAccountExists = async (rpc: SolRpc, address: Address) => {
  const { value } = await rpc.getAccountInfo(address).send()
  return value !== null
}

const ONE_IN_BASIS_POINTS = 10_000n

/**
 * Calculates the transfer fee for a given amount using the current epoch's fee configuration.
 *
 * Same math as @solana/spl-token's `calculateEpochFee`: pick the fee schedule for the epoch,
 * apply basis points with ceiling rounding, cap at `maximumFee`.
 */
export const calculateToken2022TransferFee = (
  transferFeeConfig: { olderTransferFee: TransferFee; newerTransferFee: TransferFee },
  epoch: bigint,
  amount: bigint
): bigint => {
  const { transferFeeBasisPoints, maximumFee } =
    epoch >= transferFeeConfig.newerTransferFee.epoch
      ? transferFeeConfig.newerTransferFee
      : transferFeeConfig.olderTransferFee

  if (transferFeeBasisPoints === 0 || amount === 0n) return 0n

  const numerator = amount * BigInt(transferFeeBasisPoints)
  const rawFee = (numerator + ONE_IN_BASIS_POINTS - 1n) / ONE_IN_BASIS_POINTS // ceil division

  return rawFee > maximumFee ? maximumFee : rawFee
}

const calculateCurrentEpochTransferFee = async (
  rpc: SolRpc,
  transferFeeConfig: { olderTransferFee: TransferFee; newerTransferFee: TransferFee },
  amount: bigint
): Promise<bigint> => {
  const { epoch } = await rpc.getEpochInfo().send()
  return calculateToken2022TransferFee(transferFeeConfig, epoch, amount)
}
