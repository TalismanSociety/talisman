import { Transaction, VersionedTransaction } from "@solana/web3.js"
import { base58, ed25519 } from "@talismn/crypto"

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
    const sigBytes = tx.signatures.length ? tx.signatures[0] : null

    // signature might be an array of zeros, signature needs to be verified manually
    const signature =
      sigBytes &&
      address &&
      ed25519.verify(sigBytes, tx.message.serialize(), base58.decode(address))
        ? base58.encode(sigBytes)
        : null

    return { recentBlockhash, address, signature }
  } else {
    const recentBlockhash = tx.recentBlockhash
    const address = tx.feePayer ? tx.feePayer.toBase58() : undefined
    const signature = tx.verifySignatures() ? base58.encode(tx.signature!) : null

    return { recentBlockhash, address, signature }
  }
}
