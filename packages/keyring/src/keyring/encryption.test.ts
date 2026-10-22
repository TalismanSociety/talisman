import { describe, expect, it } from "vitest"
import { decryptData, encryptData } from "./encryption"

describe("encryption", () => {
  it("encrypt/decrypt short string", async () => {
    const TEST_STRING = "hello world"
    const TEST_PASSWORD = "password"

    const encrypted = await encryptData(new TextEncoder().encode(TEST_STRING), TEST_PASSWORD)
    const decrypted = await decryptData(encrypted, TEST_PASSWORD)

    expect(new TextDecoder().decode(decrypted)).toBe(TEST_STRING)
  })

  it("encrypt/decrypt long string", async () => {
    const TEST_STRING = generateRandomUnicodeString(20_000)
    const TEST_PASSWORD = "password"

    const encrypted = await encryptData(new TextEncoder().encode(TEST_STRING), TEST_PASSWORD)
    const decrypted = await decryptData(encrypted, TEST_PASSWORD)

    expect(new TextDecoder().decode(decrypted)).toBe(TEST_STRING)
  })

  it("breaks when decrypting garbage data", async () => {
    const TEST_STRING = generateRandomUnicodeString(20_000)
    const TEST_PASSWORD = "password"

    await expect(decryptData(TEST_STRING, TEST_PASSWORD)).rejects.toThrow("Failed to decrypt data")
  })
})

// valid code points only: no surrogates, no control characters
const randomCodePoint = () =>
  Math.random() < 0.9
    ? Math.floor(Math.random() * (0xd7ff - 0x0020)) + 0x0020
    : Math.floor(Math.random() * (0x10ffff - 0xe000)) + 0xe000

const generateRandomUnicodeString = (length: number) =>
  Array.from({ length }, () => String.fromCodePoint(randomCodePoint())).join("")
