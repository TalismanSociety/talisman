import type { Transaction } from "@solana/kit"
import { base58, ed25519 } from "@talismn/crypto"

import { getCompiledMessage } from "./serialization"

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
  /** base58 signature of `address`, verified against the message bytes; null when unsigned */
  signature: string | null
}

export const parseTransactionInfo = (tx: SolTransaction): SolTransactionInfo => {
  const message = getCompiledMessage(tx)
  const signerAddresses = Object.keys(tx.signatures)

  // Behavior preserved from the web3.js implementation: legacy transactions always
  // resolve to the fee payer, versioned ones only when there is a single signer.
  const address =
    message.version === "legacy"
      ? signerAddresses[0]
      : signerAddresses.length === 1
        ? signerAddresses[0]
        : undefined

  // signature may be missing or all-zeros — always verify against the message bytes
  const sigBytes = address ? (tx.signatures[address as keyof typeof tx.signatures] ?? null) : null
  const signature =
    sigBytes &&
    address &&
    ed25519.verify(sigBytes, tx.messageBytes as unknown as Uint8Array, base58.decode(address))
      ? base58.encode(sigBytes)
      : null

  return {
    version: message.version,
    recentBlockhash: "lifetimeToken" in message ? message.lifetimeToken : "",
    feePayer: message.staticAccounts[0] as string,
    signerAddresses,
    address,
    signature,
  }
}
