import { describe, expect, it } from "vitest"

import { serializeOffchainMessage } from "./offchainMessage"

// domain (16) + version (1) + application domain (32) + format (1) + signer count (1) + signer (32) + length (2)
const HEADER_LENGTH = 85
const MAX_MESSAGE_LENGTH = 1232 - HEADER_LENGTH

const FORMAT_OFFSET = 49
const SIGNER_COUNT_OFFSET = 50
const SIGNER_OFFSET = 51
const LENGTH_OFFSET = 83

const SIGNER = new Uint8Array(32).fill(7)
const textBytes = (text: string) => new TextEncoder().encode(text)

describe("serializeOffchainMessage", () => {
  it("wraps a printable ASCII message as format 0", () => {
    const message = textBytes("Hello Solana!")
    const envelope = serializeOffchainMessage(message, SIGNER)

    expect(envelope).not.toBeNull()
    expect(envelope!.length).toBe(HEADER_LENGTH + message.length)

    // signing domain: \xff + "solana offchain"
    expect(envelope![0]).toBe(0xff)
    expect(new TextDecoder().decode(envelope!.slice(1, 16))).toBe("solana offchain")
    // header version
    expect(envelope![16]).toBe(0)
    // application domain: zeros = not provided
    expect(envelope!.slice(17, 49)).toEqual(new Uint8Array(32))
    // format: restricted ASCII
    expect(envelope![FORMAT_OFFSET]).toBe(0)
    // single signer, the provided public key
    expect(envelope![SIGNER_COUNT_OFFSET]).toBe(1)
    expect(envelope!.slice(SIGNER_OFFSET, SIGNER_OFFSET + 32)).toEqual(SIGNER)
    // length, little-endian
    expect(envelope![LENGTH_OFFSET]).toBe(message.length)
    expect(envelope![LENGTH_OFFSET + 1]).toBe(0)
    // payload
    expect(envelope!.slice(HEADER_LENGTH)).toEqual(message)
  })

  it("wraps a UTF-8 message as format 1", () => {
    // newlines are not printable ASCII - typical of SIWS messages
    const envelope = serializeOffchainMessage(textBytes("line one\nline two"), SIGNER)
    expect(envelope![FORMAT_OFFSET]).toBe(1)

    const emoji = serializeOffchainMessage(textBytes("gm ☀️"), SIGNER)
    expect(emoji![FORMAT_OFFSET]).toBe(1)
  })

  it("encodes length above 255 in little-endian", () => {
    const message = textBytes("a".repeat(300))
    const envelope = serializeOffchainMessage(message, SIGNER)

    expect(envelope![LENGTH_OFFSET]).toBe(300 & 0xff)
    expect(envelope![LENGTH_OFFSET + 1]).toBe(300 >> 8)
  })

  it("accepts a message of exactly the max length and rejects one byte more", () => {
    expect(
      serializeOffchainMessage(textBytes("a".repeat(MAX_MESSAGE_LENGTH)), SIGNER)
    ).not.toBeNull()
    expect(
      serializeOffchainMessage(textBytes("a".repeat(MAX_MESSAGE_LENGTH + 1)), SIGNER)
    ).toBeNull()
  })

  it("rejects binary content", () => {
    expect(serializeOffchainMessage(new Uint8Array([0x00, 0xc0, 0xff, 0xee]), SIGNER)).toBeNull()
  })

  it("rejects an empty message", () => {
    expect(serializeOffchainMessage(new Uint8Array(0), SIGNER)).toBeNull()
  })

  it("rejects an invalid signer public key", () => {
    expect(serializeOffchainMessage(textBytes("hello"), new Uint8Array(31))).toBeNull()
  })
})
