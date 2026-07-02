import { Transaction, VersionedTransaction } from "@solana/web3.js"
import { base58 } from "@talismn/crypto"

import { isVersionedTransaction } from "./transaction"

export const serializeTransaction = (transaction: Transaction | VersionedTransaction): string => {
  if (isVersionedTransaction(transaction)) {
    return base58.encode(transaction.serialize())
  } else {
    return base58.encode(
      transaction.serialize({ requireAllSignatures: false, verifySignatures: false })
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

export const txToHumanJSON = (tx: string | Transaction | VersionedTransaction) => {
  if (typeof tx === "string") tx = deserializeTransaction(tx)
  return isVersionedTransaction(tx) ? versionedTxToJSON(tx) : legacyTxToJSON(tx)
}

const legacyTxToJSON = (tx: Transaction) => {
  return {
    type: "legacy",
    signatures: tx.signatures.map((s) => (s.signature ? base58.encode(s.signature) : null)),
    feePayer: tx.feePayer?.toBase58() ?? null,
    recentBlockhash: tx.recentBlockhash ?? null,
    instructions: tx.instructions.map((ix) => ({
      programId: ix.programId.toBase58(),
      accounts: ix.keys.map((k) => ({
        pubkey: k.pubkey.toBase58(),
        isSigner: k.isSigner,
        isWritable: k.isWritable,
      })),
      data: base58.encode(ix.data),
    })),
  }
}

const versionedTxToJSON = (tx: VersionedTransaction) => {
  const msg = tx.message

  // ⚠️ NOTE: without address lookup table accounts we only have static keys.
  const staticKeys = msg.staticAccountKeys

  return {
    type: "versioned",
    version: msg.version, // usually 0
    signatures: tx.signatures.map((sig) => base58.encode(sig)),
    recentBlockhash: msg.recentBlockhash,
    staticAccountKeys: staticKeys.map((k) => k.toBase58()),
    addressTableLookups:
      msg.addressTableLookups?.map((l) => ({
        accountKey: l.accountKey.toBase58(),
        writableIndexes: Array.from(l.writableIndexes),
        readonlyIndexes: Array.from(l.readonlyIndexes),
      })) ?? [],
    instructions: msg.compiledInstructions.map((ix) => ({
      programIdIndex: ix.programIdIndex,
      programId: staticKeys[ix.programIdIndex]?.toBase58() ?? null,
      accounts: ix.accountKeyIndexes.map((i) => ({
        index: i,
        pubkey: staticKeys[i]?.toBase58() ?? null,
      })),
      data: base58.encode(ix.data),
    })),
  }
}
