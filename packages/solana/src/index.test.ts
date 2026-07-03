import type { Instruction } from "@solana/kit"
import { AccountRole, address as solAddress } from "@solana/kit"
import { base58, getPublicKeyFromSecret } from "@talismn/crypto"
import { describe, expect, it } from "vitest"

import {
  attachTransactionSignature,
  buildUnsignedTransaction,
  deserializeTransaction,
  getMessageBase64,
  isCompiledTransactionMessage,
  parseTransactionInfo,
  serializeOffchainMessage,
  serializeTransaction,
  setTransactionBlockhash,
  signTransactionWithSecretKey,
  transactionToBytes,
  txToHumanJSON,
} from "./index"

const SECRET_KEY = new Uint8Array(32).fill(7)
const SIGNER = base58.encode(getPublicKeyFromSecret(SECRET_KEY, "solana"))
const OTHER = "BLTQrMi4wCkrHYAaePv7bcHUuoYFPTMkxJdWkAqLB55A"
const BLOCKHASH = "EETubP5AKHgjPAhzPAFcb8BAY1hMH639CWCFTqi3hq1k"
const BLOCKHASH_2 = "8HkYFAeQFwWSduvvGgLdmwLBrhByR7A9YvDmqLPBmwQ2"

const makeTransferLikeInstruction = (from: string, to: string): Instruction => ({
  programAddress: solAddress("11111111111111111111111111111111"),
  accounts: [
    { address: solAddress(from), role: AccountRole.WRITABLE_SIGNER },
    { address: solAddress(to), role: AccountRole.WRITABLE },
  ],
  data: new Uint8Array([2, 0, 0, 0, 100, 0, 0, 0, 0, 0, 0, 0]),
})

const makeUnsignedTx = (version: "legacy" | 0 = "legacy") =>
  buildUnsignedTransaction({
    feePayer: SIGNER,
    blockhash: BLOCKHASH,
    lastValidBlockHeight: 1000n,
    instructions: [makeTransferLikeInstruction(SIGNER, OTHER)],
    version,
  })

describe("serialization round-trips", () => {
  it.each(["legacy", 0] as const)("byte-identical decode→encode (%s)", (version) => {
    const tx = makeUnsignedTx(version)
    const serialized = serializeTransaction(tx)
    const roundTripped = deserializeTransaction(serialized)

    expect(transactionToBytes(roundTripped)).toEqual(transactionToBytes(tx))
    expect(serializeTransaction(roundTripped)).toBe(serialized)
  })

  it("byte-identity survives signing", () => {
    const tx = makeUnsignedTx()
    const signed = signTransactionWithSecretKey(tx, SECRET_KEY)
    const roundTripped = deserializeTransaction(serializeTransaction(signed))

    expect(transactionToBytes(roundTripped)).toEqual(transactionToBytes(signed))
  })

  it("getMessageBase64 returns the base64 of messageBytes", () => {
    const tx = makeUnsignedTx()
    expect(getMessageBase64(tx)).toBe(Buffer.from(tx.messageBytes).toString("base64"))
  })
})

describe("signing", () => {
  it("signs and parseTransactionInfo verifies the signature", () => {
    const tx = makeUnsignedTx()

    expect(parseTransactionInfo(tx).signature).toBeNull()

    const signed = signTransactionWithSecretKey(tx, SECRET_KEY, SIGNER)
    const info = parseTransactionInfo(signed)

    expect(info.address).toBe(SIGNER)
    expect(info.feePayer).toBe(SIGNER)
    expect(info.signature).not.toBeNull()
    expect(info.recentBlockhash).toBe(BLOCKHASH)
  })

  it("throws on address mismatch", () => {
    const tx = makeUnsignedTx()
    expect(() => signTransactionWithSecretKey(tx, SECRET_KEY, OTHER)).toThrow("Address mismatch")
  })

  it("attachTransactionSignature rejects a non-signer address", () => {
    const tx = makeUnsignedTx()
    expect(() => attachTransactionSignature(tx, OTHER, new Uint8Array(64))).toThrow("not a signer")
  })

  it("does not mutate the original transaction", () => {
    const tx = makeUnsignedTx()
    signTransactionWithSecretKey(tx, SECRET_KEY)
    expect(parseTransactionInfo(tx).signature).toBeNull()
  })
})

describe("parseTransactionInfo", () => {
  it("returns address undefined for multi-signer versioned transactions", () => {
    const tx = buildUnsignedTransaction({
      feePayer: SIGNER,
      blockhash: BLOCKHASH,
      lastValidBlockHeight: 1000n,
      instructions: [
        {
          programAddress: solAddress("11111111111111111111111111111111"),
          accounts: [
            { address: solAddress(SIGNER), role: AccountRole.WRITABLE_SIGNER },
            { address: solAddress(OTHER), role: AccountRole.READONLY_SIGNER },
          ],
          data: new Uint8Array([1]),
        },
      ],
      version: 0,
    })

    const info = parseTransactionInfo(tx)
    expect(info.signerAddresses).toEqual([SIGNER, OTHER])
    expect(info.address).toBeUndefined()
    expect(info.feePayer).toBe(SIGNER)
  })
})

describe("setTransactionBlockhash", () => {
  it("changes exactly the 32 lifetime-token bytes and resets signatures", () => {
    const signed = signTransactionWithSecretKey(makeUnsignedTx(), SECRET_KEY)
    const updated = setTransactionBlockhash(signed, BLOCKHASH_2)

    expect(parseTransactionInfo(updated).recentBlockhash).toBe(BLOCKHASH_2)
    expect(Object.values(updated.signatures)).toEqual([null])

    const before = signed.messageBytes
    const after = updated.messageBytes
    expect(after.length).toBe(before.length)
    const diffCount = Array.from(before).filter((byte, i) => byte !== after[i]).length
    expect(diffCount).toBeGreaterThan(0)
    expect(diffCount).toBeLessThanOrEqual(32)
  })
})

describe("txToHumanJSON", () => {
  it("dumps a readable structure", () => {
    const signed = signTransactionWithSecretKey(makeUnsignedTx(), SECRET_KEY)
    const json = txToHumanJSON(serializeTransaction(signed))

    expect(json.version).toBe("legacy")
    expect(json.feePayer).toBe(SIGNER)
    expect(json.recentBlockhash).toBe(BLOCKHASH)
    expect(json.signatures).toHaveLength(1)
    expect(json.signatures[0]).not.toBeNull()
    expect(json.instructions).toHaveLength(1)
    expect(json.instructions[0]!.programId).toBe("11111111111111111111111111111111")
    expect(json.instructions[0]!.accounts[0]).toMatchObject({
      pubkey: SIGNER,
      isSigner: true,
      isWritable: true,
    })
  })
})

describe("isCompiledTransactionMessage", () => {
  it.each(["legacy", 0] as const)("detects a compiled %s transaction message", (version) => {
    const tx = makeUnsignedTx(version)
    expect(isCompiledTransactionMessage(new Uint8Array(tx.messageBytes))).toBe(true)
  })

  it("rejects text messages", () => {
    const encode = (text: string) => new TextEncoder().encode(text)
    expect(isCompiledTransactionMessage(encode("Hello Solana!"))).toBe(false)
    expect(
      isCompiledTransactionMessage(
        encode("kheopskit.pages.dev wants you to sign in with your Solana account:\n" + SIGNER)
      )
    ).toBe(false)
  })

  it("rejects the off-chain message envelope", () => {
    const envelope = serializeOffchainMessage(
      new TextEncoder().encode("hello"),
      base58.decode(OTHER)
    )
    expect(isCompiledTransactionMessage(envelope!)).toBe(false)
  })

  it("rejects a transaction message with trailing bytes", () => {
    const tx = makeUnsignedTx()
    const padded = new Uint8Array([...tx.messageBytes, 0])
    expect(isCompiledTransactionMessage(padded)).toBe(false)
  })
})
