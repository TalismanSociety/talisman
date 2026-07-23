import { describe, expect, test } from "vitest"

import { base64ToBytes, base64UrlToBytes, bytesToBase64, bytesToBase64Url } from "./base64"

// contains bytes that encode to the two characters base64url replaces
const SAMPLE = new Uint8Array([0, 1, 62, 63, 127, 128, 254, 255])

describe("base64", () => {
  test("round trips bytes", () => {
    expect(base64ToBytes(bytesToBase64(SAMPLE))).toEqual(SAMPLE)
  })

  test("round trips bytes as base64url", () => {
    expect(base64UrlToBytes(bytesToBase64Url(SAMPLE))).toEqual(SAMPLE)
  })

  test("base64url is url safe and unpadded", () => {
    const encoded = bytesToBase64Url(SAMPLE)
    expect(encoded).not.toMatch(/[+/=]/)
    expect(bytesToBase64(SAMPLE)).toMatch(/[+/=]/)
  })

  test("accepts an ArrayBuffer", () => {
    expect(bytesToBase64(SAMPLE.buffer)).toEqual(bytesToBase64(SAMPLE))
  })

  test("round trips every possible byte", () => {
    const allBytes = new Uint8Array(256).map((_, i) => i)
    expect(base64ToBytes(bytesToBase64(allBytes))).toEqual(allBytes)
    expect(base64UrlToBytes(bytesToBase64Url(allBytes))).toEqual(allBytes)
  })
})
