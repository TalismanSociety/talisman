// Solana off-chain message envelope (v0), as specified by Anza and enforced by the Ledger app
// (1.8.0+): https://github.com/anza-xyz/agave/blob/master/docs/src/proposals/off-chain-message-signing.md
//
//   signing domain "\xffsolana offchain" (16 bytes) || header version (1 byte, 0) ||
//   application domain (32 bytes, zeros = not provided) || message format (1 byte) ||
//   signer count (1 byte) || signers (32 bytes each) || message length (2 bytes LE) || message
//
// Hardware wallets refuse to sign arbitrary raw bytes - only transactions and messages wrapped
// in this envelope, and the derivation path's public key must appear in the signers list.
// Note this is NOT the format implemented by @solana/offchain-messages (kit), whose codec
// details differ from what the Ledger app validates.

const SIGNING_DOMAIN = new Uint8Array([
  0xff,
  ...Array.from("solana offchain", (c) => c.charCodeAt(0)),
])

const APPLICATION_DOMAIN_LENGTH = 32
const PUBLIC_KEY_LENGTH = 32

// domain + version + application domain + format + signer count + one signer + length
const HEADER_LENGTH =
  SIGNING_DOMAIN.length + 1 + APPLICATION_DOMAIN_LENGTH + 1 + 1 + PUBLIC_KEY_LENGTH + 2

/** Hardware wallet compatible v0 messages are capped at 1232 bytes total, header included */
const MAX_MESSAGE_LENGTH = 1232 - HEADER_LENGTH

const FORMAT_RESTRICTED_ASCII = 0
const FORMAT_LIMITED_UTF8 = 1

const getMessageFormat = (message: Uint8Array): number | null => {
  if (message.every((byte) => byte >= 0x20 && byte <= 0x7e)) return FORMAT_RESTRICTED_ASCII

  try {
    new TextDecoder("utf-8", { fatal: true }).decode(message)
    return FORMAT_LIMITED_UTF8
  } catch {
    return null // binary content cannot be wrapped
  }
}

/**
 * Wraps a raw message in the off-chain message envelope that hardware wallets sign.
 * Returns `null` if the message cannot be wrapped (binary content, empty, or too long).
 */
export const serializeOffchainMessage = (
  message: Uint8Array,
  signerPublicKey: Uint8Array
): Uint8Array | null => {
  if (message.length === 0 || message.length > MAX_MESSAGE_LENGTH) return null
  if (signerPublicKey.length !== PUBLIC_KEY_LENGTH) return null

  const format = getMessageFormat(message)
  if (format === null) return null

  const envelope = new Uint8Array(HEADER_LENGTH + message.length)
  let offset = 0

  envelope.set(SIGNING_DOMAIN, offset)
  offset += SIGNING_DOMAIN.length

  envelope[offset++] = 0 // header version

  offset += APPLICATION_DOMAIN_LENGTH // application domain: zeros = not provided

  envelope[offset++] = format
  envelope[offset++] = 1 // signer count

  envelope.set(signerPublicKey, offset)
  offset += PUBLIC_KEY_LENGTH

  envelope[offset++] = message.length & 0xff
  envelope[offset++] = message.length >> 8

  envelope.set(message, offset)

  return envelope
}
