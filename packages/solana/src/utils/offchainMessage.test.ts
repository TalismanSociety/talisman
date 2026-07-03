import { describe, expect, it } from "vitest"

import { serializeOffchainMessage } from "./offchainMessage"

const HEADER_LENGTH = 20
const textBytes = (text: string) => new TextEncoder().encode(text)

describe("serializeOffchainMessage", () => {
  it("wraps a printable ASCII message as format 0", () => {
    const message = textBytes("Hello Solana!")
    const envelope = serializeOffchainMessage(message)

    expect(envelope).not.toBeNull()
    expect(envelope!.length).toBe(HEADER_LENGTH + message.length)

    // signing domain: \xff + "solana offchain"
    expect(envelope![0]).toBe(0xff)
    expect(new TextDecoder().decode(envelope!.slice(1, 16))).toBe("solana offchain")
    // header version
    expect(envelope![16]).toBe(0)
    // format: restricted ASCII
    expect(envelope![17]).toBe(0)
    // length, little-endian
    expect(envelope![18]).toBe(message.length)
    expect(envelope![19]).toBe(0)
    // payload
    expect(envelope!.slice(HEADER_LENGTH)).toEqual(message)
  })

  it("wraps a UTF-8 message as format 1", () => {
    // newlines are not printable ASCII - typical of SIWS messages
    const envelope = serializeOffchainMessage(textBytes("line one\nline two"))
    expect(envelope![17]).toBe(1)

    const emoji = serializeOffchainMessage(textBytes("gm ☀️"))
    expect(emoji![17]).toBe(1)
  })

  it("encodes length above 255 in little-endian", () => {
    const message = textBytes("a".repeat(300))
    const envelope = serializeOffchainMessage(message)

    expect(envelope![18]).toBe(300 & 0xff)
    expect(envelope![19]).toBe(300 >> 8)
  })

  it("accepts a message of exactly 1212 bytes and rejects 1213", () => {
    expect(serializeOffchainMessage(textBytes("a".repeat(1212)))).not.toBeNull()
    expect(serializeOffchainMessage(textBytes("a".repeat(1213)))).toBeNull()
  })

  it("rejects binary content", () => {
    expect(serializeOffchainMessage(new Uint8Array([0x00, 0xc0, 0xff, 0xee]))).toBeNull()
  })

  it("accepts an empty message", () => {
    const envelope = serializeOffchainMessage(new Uint8Array(0))
    expect(envelope!.length).toBe(HEADER_LENGTH)
    expect(envelope![17]).toBe(0)
  })
})
