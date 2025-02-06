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
  // console.log("signSecp256k1 sk length", sk.length);
  // we might want to sign a hash, not the payload itself
  //const hash = getSecp256k1Hash(payload, hasher);

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

// const getSecp256k1Hash = (data: Uint8Array, hasher: "blake2" | "keccak") => {
//   // TODO: for now let s consider the actual signer (consummer) will hash the payload if needed
//   // remove this method once confirmed.
//   return data;
// };
