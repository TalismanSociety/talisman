import { hex } from "@scure/base"
import { Bytes, str, Tuple, u32 } from "scale-ts"

import { blake2b256 } from "../hashing"

// Inspired from MIT licensed @polkadot-labs/hdkd helpers
// https://github.com/polkadot-labs/hdkd/blob/3ef6e02827212d934b59a4e566d8aa61d3ba7b27/packages/hdkd-helpers/src/parseDerivations.ts#L1

// A path is a run of junctions, each `//code` (hard) or `/code` (soft), and nothing else: it
// takes no password. The empty path is the root key. Codes are limited to [A-Za-z0-9_]:
// polkadot-js allows any character but `/`, and for those codes it derives keys that this
// parser has never produced, so they are rejected rather than derived to a key that differs
// from polkadot-js or from earlier Talisman versions.
const DERIVATION_PATH_RE = /^(\/\/?\w+)*$/
const DERIVATION_RE = /(\/{1,2})(\w+)/g

const CHAIN_CODE_LENGTH = 32
// polkadot-js encodes a numeric junction into the 32 bytes of a chain code, and throws above
const NUMERIC_CODE_LIMIT = 2n ** BigInt(CHAIN_CODE_LENGTH * 8)

type DerivationDescriptor = [type: "hard" | "soft", code: string]

export const parseSubstrateDerivations = (derivationsStr: string): DerivationDescriptor[] => {
  // In polkadot-js and subkey, `<mnemonic>//hard///password` is not a junction named
  // `password`: the password goes into the mnemonic-to-seed step (`entropyToSeed`), and every
  // junction derives from that seed. This function receives the seed after that step, and the
  // keyring computes it without a password. Earlier versions of this parser read `///password`
  // as the hard junction `//password`, an account polkadot-js derives from `//hard//password`,
  // not from `//hard///password`. Rejecting the syntax keeps a path written for polkadot-js
  // from deriving another account without an error.
  if (derivationsStr.includes("///"))
    throw new Error("Passwords (///) are not supported in derivation paths")
  if (!DERIVATION_PATH_RE.test(derivationsStr))
    throw new Error(`Invalid derivation path: ${derivationsStr}`)

  const derivations = [] as DerivationDescriptor[]
  for (const [_, type, code] of derivationsStr.matchAll(DERIVATION_RE))
    derivations.push([type === "//" ? "hard" : "soft", code as string])
  return derivations
}

const padChainCode = (bytes: Uint8Array) => {
  const chainCode = new Uint8Array(CHAIN_CODE_LENGTH)
  // polkadot-js hashes junction ids longer than 32 bytes (DeriveJunction.soft)
  chainCode.set(bytes.length > CHAIN_CODE_LENGTH ? blake2b256(bytes) : bytes)
  return chainCode
}

const isEqualBytes = (a: Uint8Array, b: Uint8Array) =>
  a.length === b.length && a.every((byte, i) => byte === b[i])

const littleEndianChainCode = (value: bigint) => {
  const chainCode = new Uint8Array(CHAIN_CODE_LENGTH)
  for (let i = 0; value > 0n; i++, value >>= 8n) chainCode[i] = Number(value & 0xffn)
  return chainCode
}

/**
 * Encodes a junction code into its 32-byte chain code, as polkadot-js `DeriveJunction.from` does:
 * - a decimal integer is a little-endian number of up to 256 bits;
 * - `0x` followed by whole bytes is those bytes;
 * - anything else is a SCALE-encoded string.
 *
 * Earlier versions of this package read every code that JavaScript parses as a number (`+code`)
 * as a u32. For a decimal below 2^32 that is the polkadot-js encoding. A larger decimal wrapped
 * (`//4294967296` derived the key of `//0`), which no user could have meant; it now derives the
 * polkadot-js key. Substrate's subkey reads a decimal of 2^64 or more as text, so above that
 * this follows polkadot-js only.
 *
 * Hex, `0b`/`0o`, exponent and `Infinity` codes were read as numbers too, where polkadot-js reads
 * them as bytes or text. Such a code derives only where both readings agree (a hex code such as
 * `0x10` whose bytes are its own little-endian value) and throws otherwise, so it never derives a
 * key that differs from either.
 */
export const createChainCode = (code: string) => {
  if (/^\d+$/.test(code)) {
    const index = BigInt(code)
    if (index >= NUMERIC_CODE_LIMIT) throw new Error(`Derivation index out of range: ${code}`)
    return littleEndianChainCode(index)
  }

  // polkadot-js reads a bare `0x` as empty bytes
  if (code !== "0x" && Number.isNaN(+code)) return padChainCode(str.enc(code))

  if (/^0x([0-9a-fA-F]{2})+$/.test(code)) {
    const chainCode = padChainCode(hex.decode(code.slice(2)))
    if (isEqualBytes(chainCode, padChainCode(u32.enc(+code)))) return chainCode
  }

  throw new Error(`Ambiguous numeric derivation code: ${code}`)
}

const derivationCodec = /* @__PURE__ */ Tuple(str, Bytes(32), Bytes(32))
const createSubstrateDeriveFn = (prefix: string) => (seed: Uint8Array, chainCode: Uint8Array) =>
  blake2b256(derivationCodec.enc([prefix, seed, chainCode]))

export const deriveSubstrateSecretKey = (
  seed: Uint8Array,
  derivationPath: string,
  prefix: string
) => {
  const derivations = parseSubstrateDerivations(derivationPath)
  const derive = createSubstrateDeriveFn(prefix)

  return derivations.reduce((seed, [type, chainCode]) => {
    const code = createChainCode(chainCode)
    if (type === "soft") throw new Error("Soft derivations are not supported")
    return derive(seed, code)
  }, seed)
}
