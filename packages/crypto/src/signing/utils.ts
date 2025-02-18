import { ed25519 } from "@noble/curves/ed25519"
import { secp256k1 } from "@noble/curves/secp256k1"
import * as sr25519 from "micro-sr25519"

export const signSr25519 = (payload: Uint8Array, sk: Uint8Array) => {
  return sr25519.sign(sk, payload)
}

export const signEd25519 = (payload: Uint8Array, sk: Uint8Array) => {
  return ed25519.sign(payload, sk)
}

export const signSecp256k1 = (
  payload: Uint8Array,
  sk: Uint8Array,
  // hasher: "blake2" | "keccak"
) => {
  // TODO determine if we need to hash payloads before ecdsa signing
  return secp256k1
    .sign(payload, sk, {
      lowS: true,
    })
    .toCompactRawBytes()
}

export const verifySignatureSr25519 = (
  data: Uint8Array,
  signature: Uint8Array,
  publicKey: Uint8Array,
) => {
  return sr25519.verify(data, signature, publicKey)
}

export const verifySignatureEd25519 = (
  data: Uint8Array,
  signature: Uint8Array,
  publicKey: Uint8Array,
) => {
  return ed25519.verify(signature, data, publicKey)
}

export const verifySignatureSecp256k1 = (
  data: Uint8Array,
  signature: Uint8Array,
  publicKey: Uint8Array,
) => {
  return secp256k1.verify(signature, data, publicKey, { lowS: true })
}
