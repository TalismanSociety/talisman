import type { Transaction } from "@solana/kit"
import { base58 } from "@talismn/crypto"

import { getCompiledMessage } from "./serialization"
import { getVerifiedTransactionSignature } from "./signing"

/**
 * A Solana transaction: raw wire message bytes plus a signer-address → signature map.
 * Kit's decoder/encoder handles both legacy and v0 wire formats transparently.
 */
export type SolTransaction = Transaction

export type SolTransactionInfo = {
  version: "legacy" | 0 | 1
  /** compiled lifetime token — the recent blockhash (or nonce for durable-nonce transactions) */
  recentBlockhash: string
  /** first static account, the account that pays the transaction fee */
  feePayer: string
  /** all required signer addresses, in wire order */
  signerAddresses: string[]
  /**
   * The account expected to sign in wallet flows.
   * `undefined` when the transaction has several signers (e.g. sponsored/partially-signed
   * dapp transactions) — callers use this to fall back to the dapp-provided address.
   */
  address: string | undefined
  /**
   * canonical (fee payer) base58 transaction signature, verified against the message bytes;
   * null when the fee payer hasn't signed
   */
  signature: string | null
}

export const parseTransactionInfo = (tx: SolTransaction): SolTransactionInfo => {
  const message = getCompiledMessage(tx)
  const signerAddresses = Object.keys(tx.signatures)
  const feePayer = message.staticAccounts[0] as string

  // Behavior preserved from the web3.js implementation: legacy transactions always
  // resolve to the fee payer, versioned ones only when there is a single signer.
  const address =
    message.version === "legacy"
      ? signerAddresses[0]
      : signerAddresses.length === 1
        ? signerAddresses[0]
        : undefined

  // the canonical transaction signature is the fee payer's — may be missing or
  // all-zeros, so always verify against the message bytes
  const sigBytes = getVerifiedTransactionSignature(tx, feePayer)

  return {
    version: message.version,
    recentBlockhash: "lifetimeToken" in message ? message.lifetimeToken : "",
    feePayer,
    signerAddresses,
    address,
    signature: sigBytes ? base58.encode(sigBytes) : null,
  }
}
