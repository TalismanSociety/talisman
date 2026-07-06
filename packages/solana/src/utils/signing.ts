import type { SignatureBytes } from "@solana/kit"
import { base58, ed25519, getPublicKeyFromSecret } from "@talismn/crypto"

import type { SolTransaction } from "./transaction"

/**
 * Returns a copy of the transaction with `signature` attached for `address`.
 * Throws if `address` is not a required signer of the transaction (the signatures
 * map is keyed in wire order at decode time — adding a key would corrupt re-encoding).
 */
export const attachTransactionSignature = (
  tx: SolTransaction,
  address: string,
  signature: Uint8Array
): SolTransaction => {
  if (!(address in tx.signatures))
    throw new Error(`Address ${address} is not a signer of this transaction`)

  return Object.freeze({
    ...tx,
    signatures: Object.freeze({ ...tx.signatures, [address]: signature as SignatureBytes }),
  })
}

/**
 * Returns the signature attached for `address`, verified against the transaction's message
 * bytes; null when missing, all-zeros, or invalid. Unlike `parseTransactionInfo`, this checks
 * a specific signer's slot, so it works on transactions with co-signers.
 */
export const getVerifiedTransactionSignature = (
  tx: SolTransaction,
  address: string
): Uint8Array | null => {
  const signature = tx.signatures[address as keyof typeof tx.signatures]
  return signature &&
    ed25519.verify(signature, tx.messageBytes as unknown as Uint8Array, base58.decode(address))
    ? signature
    : null
}

/**
 * Signs the transaction's message bytes with the given ed25519 secret key and
 * attaches the signature. Signing happens with @noble/curves (via @talismn/crypto),
 * not WebCrypto — Ed25519 subtle crypto is too recent for the extension's support matrix.
 */
export const signTransactionWithSecretKey = (
  tx: SolTransaction,
  secretKey: Uint8Array,
  expectedAddress?: string
): SolTransaction => {
  const address = base58.encode(getPublicKeyFromSecret(secretKey, "solana"))

  if (expectedAddress && address !== expectedAddress) throw new Error("Address mismatch")

  const signature = ed25519.sign(tx.messageBytes as unknown as Uint8Array, secretKey)

  return attachTransactionSignature(tx, address, signature)
}
