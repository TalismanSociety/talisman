import { schnorr, secp256k1 } from "@noble/curves/secp256k1.js"
import { ripemd160 } from "@noble/hashes/legacy.js"
import { sha256 } from "@noble/hashes/sha2.js"
import { concatBytes } from "@noble/hashes/utils.js"
import { base64, hex } from "@scure/base"
import { Address, OutScript, SigHash, Transaction } from "@scure/btc-signer"

import { getBtcSignerNetwork } from "../networks"
import type { BitcoinNetworkName } from "../types"

// BIP340 tagged hash: sha256(sha256(tag) || sha256(tag) || msg)
const taggedHash = (tag: string, msg: Uint8Array) => {
  const tagHash = sha256(new TextEncoder().encode(tag))
  return sha256(concatBytes(tagHash, tagHash, msg))
}

const sha256d = (data: Uint8Array) => sha256(sha256(data))

const encodeVarInt = (n: number): Uint8Array => {
  if (n < 0xfd) return new Uint8Array([n])
  if (n <= 0xffff) return new Uint8Array([0xfd, n & 0xff, (n >> 8) & 0xff])
  throw new Error("varint too large for BIP322 purposes")
}

const OP_RETURN_SCRIPT = new Uint8Array([0x6a])

/** BIP322 message hash: tagged_hash("BIP0322-signed-message", message) */
export const getBip322MessageHash = (message: string): Uint8Array =>
  taggedHash("BIP0322-signed-message", new TextEncoder().encode(message))

/**
 * Serializes the virtual "to_spend" transaction of BIP322 and returns its txid in
 * display byte order (what btc-signer's addInput expects).
 *
 * to_spend: version 0, one input spending 000...000:0xffffffff with
 * scriptSig = OP_0 PUSH32(message_hash), one output of value 0 paying the address.
 */
const getToSpendTxid = (messageHash: Uint8Array, scriptPubKey: Uint8Array): Uint8Array => {
  const scriptSig = concatBytes(new Uint8Array([0x00, 0x20]), messageHash)
  const raw = concatBytes(
    new Uint8Array([0x00, 0x00, 0x00, 0x00]), // version 0
    encodeVarInt(1), // input count
    new Uint8Array(32), // prevout txid: zeros
    new Uint8Array([0xff, 0xff, 0xff, 0xff]), // prevout index
    encodeVarInt(scriptSig.length),
    scriptSig,
    new Uint8Array([0x00, 0x00, 0x00, 0x00]), // sequence 0
    encodeVarInt(1), // output count
    new Uint8Array(8), // value 0
    encodeVarInt(scriptPubKey.length),
    scriptPubKey,
    new Uint8Array([0x00, 0x00, 0x00, 0x00]) // locktime 0
  )
  return sha256d(raw).reverse()
}

const getScriptPubKey = (address: string, network: BitcoinNetworkName): Uint8Array => {
  const btcNetwork = getBtcSignerNetwork(network)
  // TS6 quibbles over the decode/encode union round-trip; the values are compatible
  const decoded = Address(btcNetwork).decode(address) as Parameters<typeof OutScript.encode>[0]
  return OutScript.encode(decoded)
}

/** builds the unsigned BIP322 "to_sign" transaction for an address + message */
const buildToSign = (address: string, message: string, network: BitcoinNetworkName) => {
  const scriptPubKey = getScriptPubKey(address, network)
  const toSpendTxid = getToSpendTxid(getBip322MessageHash(message), scriptPubKey)

  const isTaproot = address.startsWith("bc1p") || address.startsWith("tb1p")

  const tx = new Transaction({
    version: 0,
    lockTime: 0,
    allowUnknownOutputs: true,
  })
  tx.addInput({
    txid: toSpendTxid,
    index: 0,
    sequence: 0,
    witnessUtxo: { script: scriptPubKey, amount: 0n },
  })
  tx.addOutput({ script: OP_RETURN_SCRIPT, amount: 0n })

  return { tx, scriptPubKey, isTaproot }
}

const serializeWitness = (elements: Uint8Array[]): Uint8Array =>
  concatBytes(
    encodeVarInt(elements.length),
    ...elements.flatMap((el) => [encodeVarInt(el.length), el])
  )

const parseWitness = (data: Uint8Array): Uint8Array[] => {
  let offset = 0
  const readVarInt = () => {
    const first = data[offset]
    if (first < 0xfd) {
      offset += 1
      return first
    }
    if (first === 0xfd) {
      const value = data[offset + 1] | (data[offset + 2] << 8)
      offset += 3
      return value
    }
    throw new Error("Unsupported witness encoding")
  }
  const count = readVarInt()
  const elements: Uint8Array[] = []
  for (let i = 0; i < count; i++) {
    const length = readVarInt()
    elements.push(data.subarray(offset, offset + length))
    offset += length
  }
  if (offset !== data.length) throw new Error("Trailing bytes in witness")
  return elements
}

/**
 * Signs a message with the BIP322 "simple" scheme for a P2WPKH or P2TR address.
 * Returns the base64-encoded witness of the virtual to_sign transaction — the format
 * Bitcoin Core, Sparrow, and dapp signMessage APIs expect.
 */
export const signBip322Simple = (params: {
  address: string
  message: string
  secretKey: Uint8Array
  network?: BitcoinNetworkName
}): string => {
  const network = params.network ?? "bitcoin"
  const { tx, isTaproot } = buildToSign(params.address, params.message, network)

  if (isTaproot) {
    // key-path spend: btc-signer applies the taproot tweak when tapInternalKey is set
    const publicKey = secp256k1.getPublicKey(params.secretKey, true)
    tx.updateInput(0, { tapInternalKey: publicKey.slice(1) })
  }

  tx.signIdx(params.secretKey, 0, isTaproot ? [SigHash.DEFAULT] : [SigHash.ALL])
  tx.finalizeIdx(0)

  const witness = tx.getInput(0).finalScriptWitness
  if (!witness?.length) throw new Error("Signing produced no witness")
  return base64.encode(serializeWitness(witness as Uint8Array[]))
}

/**
 * Verifies a BIP322 "simple" signature for a P2WPKH or P2TR address.
 * Reconstructs the virtual transactions and checks the witness signature against
 * the address's script — full script evaluation is not performed, which is
 * sufficient for the single-key scripts this wallet produces.
 */
export const verifyBip322Simple = (params: {
  address: string
  message: string
  signature: string
  network?: BitcoinNetworkName
}): boolean => {
  try {
    const network = params.network ?? "bitcoin"
    const { tx, scriptPubKey, isTaproot } = buildToSign(params.address, params.message, network)
    const witness = parseWitness(base64.decode(params.signature))

    if (isTaproot) {
      if (witness.length !== 1) return false
      const signature = witness[0]
      // 64 bytes = SIGHASH_DEFAULT; 65 bytes = explicit sighash byte appended
      const hashType = signature.length === 65 ? signature[64] : SigHash.DEFAULT
      if (signature.length !== 64 && signature.length !== 65) return false
      if (hashType !== SigHash.DEFAULT && hashType !== SigHash.ALL) return false
      // output key is the witness program of the p2tr script (OP_1 PUSH32 <key>)
      const outputKey = scriptPubKey.subarray(2)
      const sighash = tx.preimageWitnessV1(0, [scriptPubKey], hashType, [0n])
      return schnorr.verify(signature.subarray(0, 64), sighash, outputKey)
    }

    if (witness.length !== 2) return false
    const [derWithHashType, publicKey] = witness
    if (publicKey.length !== 33) return false

    // the witness program must commit to this public key: hash160(pubkey)
    const program = scriptPubKey.subarray(2)
    const hash160 = ripemd160(sha256(publicKey))
    if (hex.encode(hash160) !== hex.encode(program)) return false

    const hashType = derWithHashType[derWithHashType.length - 1]
    if (hashType !== SigHash.ALL) return false
    const der = derWithHashType.subarray(0, derWithHashType.length - 1)

    // BIP143 sighash over the implied p2pkh script of the key
    const spendScript = OutScript.encode({ type: "pkh", hash: hash160 })
    const sighash = tx.preimageWitnessV0(0, spendScript, SigHash.ALL, 0n)
    const signature = secp256k1.Signature.fromBytes(der, "der")
    // the sighash is already the final digest — noble must not hash it again
    return secp256k1.verify(signature.toBytes("compact"), sighash, publicKey, { prehash: false })
  } catch {
    return false
  }
}
