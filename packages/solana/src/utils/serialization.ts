import { PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js"

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
      .serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      })
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
