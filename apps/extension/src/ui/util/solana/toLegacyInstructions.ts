import type { Instruction } from "@solana/kit"
import { AccountRole } from "@solana/kit"
import { PublicKey, TransactionInstruction } from "@solana/web3.js"

/**
 * Converts a kit `Instruction` to a legacy web3.js `TransactionInstruction`.
 *
 * Transitional: kept only while transactions are still assembled/signed with
 * web3.js classes — removed once the transaction model moves to kit.
 */
export const toLegacyInstruction = (ix: Instruction): TransactionInstruction =>
  new TransactionInstruction({
    programId: new PublicKey(ix.programAddress),
    keys: (ix.accounts ?? []).map((meta) => ({
      pubkey: new PublicKey(meta.address),
      isSigner:
        meta.role === AccountRole.READONLY_SIGNER || meta.role === AccountRole.WRITABLE_SIGNER,
      isWritable: meta.role === AccountRole.WRITABLE || meta.role === AccountRole.WRITABLE_SIGNER,
    })),
    data: Buffer.from(ix.data ?? new Uint8Array()),
  })

export const toLegacyInstructions = (instructions: Instruction[]): TransactionInstruction[] =>
  instructions.map(toLegacyInstruction)
