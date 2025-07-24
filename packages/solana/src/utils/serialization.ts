import {
  PublicKey,
  Transaction,
  TransactionInstruction,
  VersionedTransaction,
} from "@solana/web3.js"
import { base58 } from "@talismn/crypto"

import { isVersionedTransaction } from "./transaction"

// Serialize TransactionInstruction to JSON
export const solInstructionToJson = (instruction: TransactionInstruction) => {
  return {
    type: "solana-instruction" as const,
    value: {
      programId: instruction.programId.toString(),
      keys: instruction.keys.map((key) => ({
        pubkey: key.pubkey.toString(),
        isSigner: key.isSigner,
        isWritable: key.isWritable,
      })),
      data: instruction.data.toString("base64"),
    },
  }
}

export type SolInstructionJson = ReturnType<typeof solInstructionToJson>

// Deserialize JSON back to TransactionInstruction
export const solInstructionFromJson = (serialized: SolInstructionJson): TransactionInstruction => {
  if (serialized.type !== "solana-instruction")
    throw new Error("Invalid serialized instruction type")

  return {
    programId: new PublicKey(serialized.value.programId),
    keys: serialized.value.keys.map((key) => ({
      pubkey: new PublicKey(key.pubkey),
      isSigner: key.isSigner,
      isWritable: key.isWritable,
    })),
    data: Buffer.from(serialized.value.data, "base64"),
  }
}

export const solTransactionToJson = (transaction: Transaction) => {
  return {
    type: "solana-transaction" as const,
    value: transaction
      .serialize(
        transaction.signature
          ? undefined
          : {
              // if tx is not signed yet, we need this flag or it throws an error
              requireAllSignatures: false,
              verifySignatures: false,
            },
      )
      .toString("base64"),
  }
}

export type SolTransactionJson = ReturnType<typeof solTransactionToJson>

export const solTransactionFromJson = (serialized: SolTransactionJson): Transaction => {
  if (serialized.type !== "solana-transaction")
    throw new Error("Invalid serialized transaction type")

  const buffer = Buffer.from(serialized.value, "base64")
  return Transaction.from(buffer)
}

export const serializeTransaction = (transaction: Transaction | VersionedTransaction): string => {
  if (isVersionedTransaction(transaction)) {
    return base58.encode(transaction.serialize())
  } else {
    return base58.encode(
      transaction.serialize({ requireAllSignatures: false, verifySignatures: false }),
    )
  }
}

export const deserializeTransaction = (transaction: string): Transaction | VersionedTransaction => {
  const bytes = base58.decode(transaction)
  try {
    return VersionedTransaction.deserialize(bytes)
  } catch {
    return Transaction.from(bytes)
  }
}
