import { Transaction, VersionedTransaction } from "@solana/web3.js"
import { base58 } from "@talismn/crypto"

export const isVersionedTransaction = (
  transaction: Transaction | VersionedTransaction,
): transaction is VersionedTransaction => {
  return "version" in transaction
}

export const parseTransactionInfo = (tx: Transaction | VersionedTransaction) => {
  if (isVersionedTransaction(tx)) {
    const recentBlockhash = tx.message.recentBlockhash
    const requiredSigners = tx.message.staticAccountKeys.filter((_, index) =>
      tx.message.isAccountSigner(index),
    )
    const address = requiredSigners.length === 1 ? requiredSigners[0].toBase58() : undefined
    const signature = tx.signatures.length ? base58.encode(tx.signatures[0]) : null

    return { recentBlockhash, address, signature }
  } else {
    const recentBlockhash = tx.recentBlockhash
    const address = tx.feePayer ? tx.feePayer.toBase58() : undefined
    const signature = tx.signature ? base58.encode(tx.signature) : null

    return { recentBlockhash, address, signature }
  }
}
