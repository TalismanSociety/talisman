// Solana off-chain message envelope (v0), as specified by the Solana CLI and enforced by the
// Ledger app: https://docs.anza.xyz/cli/examples/sign-offchain-message
//
//   signing domain "\xffsolana offchain" (16 bytes) || header version (1 byte, 0) ||
//   message format (1 byte) || message length (2 bytes LE) || message
//
// Hardware wallets refuse to sign arbitrary raw bytes - only transactions and messages wrapped
// in this envelope. Note this is NOT the format implemented by @solana/offchain-messages (kit),
// which follows a newer proposal (32-byte application domain + signer list) that the Ledger app
// does not accept.

const SIGNING_DOMAIN = new Uint8Array([
  0xff,
  ...Array.from("solana offchain", (c) => c.charCodeAt(0)),
])
const HEADER_LENGTH = SIGNING_DOMAIN.length + 4

/** Max message length signable by hardware wallets: 1232 (max total) minus the 20-byte header */
const MAX_MESSAGE_LENGTH = 1212

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
 * Returns `null` if the message cannot be wrapped (binary content, or longer than 1212 bytes).
 */
export const serializeOffchainMessage = (message: Uint8Array): Uint8Array | null => {
  if (message.length > MAX_MESSAGE_LENGTH) return null

  const format = getMessageFormat(message)
  if (format === null) return null

  const envelope = new Uint8Array(HEADER_LENGTH + message.length)
  envelope.set(SIGNING_DOMAIN, 0)
  envelope[SIGNING_DOMAIN.length] = 0 // header version
  envelope[SIGNING_DOMAIN.length + 1] = format
  envelope[SIGNING_DOMAIN.length + 2] = message.length & 0xff
  envelope[SIGNING_DOMAIN.length + 3] = message.length >> 8
  envelope.set(message, HEADER_LENGTH)

  return envelope
}
