import { secp256k1 } from "@noble/curves/secp256k1.js"
import {
  type Address,
  bytesToHex,
  type Hex,
  hashMessage,
  hexToBigInt,
  hexToBytes,
  hexToNumber,
  type SignableMessage,
  size,
  slice,
} from "viem"
import { publicKeyToAddress } from "viem/accounts"

const toRecoveryBit = (yParityOrV: number) => {
  if (yParityOrV === 0 || yParityOrV === 1) return yParityOrV
  if (yParityOrV === 27) return 0
  if (yParityOrV === 28) return 1
  throw new Error("Invalid yParityOrV value")
}

/**
 * The background recovers signers here, never with viem's `recover*` and `verify*` helpers: these load
 * secp256k1 with a dynamic `import()`, which a Chrome build wraps in a preload that needs a DOM, so
 * they throw in the service worker.
 */
const recoverAddress = (hash: Hex, r: Hex, s: Hex, yParityOrV: number): Address => {
  const publicKey = new secp256k1.Signature(hexToBigInt(r), hexToBigInt(s))
    .addRecoveryBit(toRecoveryBit(yParityOrV))
    .recoverPublicKey(hexToBytes(hash))
    .toBytes(false)
  return publicKeyToAddress(bytesToHex(publicKey))
}

export const recoverMessageSigner = (message: SignableMessage, signature: Hex): Address => {
  if (size(signature) !== 65) throw new Error("invalid signature length")
  return recoverAddress(
    hashMessage(message),
    slice(signature, 0, 32),
    slice(signature, 32, 64),
    hexToNumber(slice(signature, 64))
  )
}
