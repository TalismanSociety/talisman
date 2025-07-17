import { PublicKey, TransactionInstruction } from "@solana/web3.js"

// Serialize TransactionInstruction to JSON
export const serializeInstruction = (instruction: TransactionInstruction) => {
  return {
    programId: instruction.programId.toString(),
    keys: instruction.keys.map((key) => ({
      pubkey: key.pubkey.toString(),
      isSigner: key.isSigner,
      isWritable: key.isWritable,
    })),
    data: instruction.data.toString("base64"),
  }
}

export type SerializedInstruction = ReturnType<typeof serializeInstruction>

// Deserialize JSON back to TransactionInstruction
export const deserializeInstruction = (
  serialized: SerializedInstruction,
): TransactionInstruction => {
  return {
    programId: new PublicKey(serialized.programId),
    keys: serialized.keys.map((key) => ({
      pubkey: new PublicKey(key.pubkey),
      isSigner: key.isSigner,
      isWritable: key.isWritable,
    })),
    data: Buffer.from(serialized.data, "base64"),
  }
}
