import { describe, expect, it, vi } from "vitest"
import { changeEncryptedDataPassword, decryptData, encryptData } from "./encryption"

describe("encryption", () => {
  it("encrypt/decrypt short string", async () => {
    const TEST_STRING = "hello world"
    const TEST_PASSWORD = "password"

    const encrypted = await encryptData(new TextEncoder().encode(TEST_STRING), TEST_PASSWORD)
    const decrypted = await decryptData(encrypted, TEST_PASSWORD)

    expect(new TextDecoder("utf-8", { ignoreBOM: true }).decode(decrypted)).toBe(TEST_STRING)
  })

  it("encrypt/decrypt long string", async () => {
    const TEST_STRING = generateRandomUnicodeString(20_000)
    const TEST_PASSWORD = "password"

    const encrypted = await encryptData(new TextEncoder().encode(TEST_STRING), TEST_PASSWORD)
    const decrypted = await decryptData(encrypted, TEST_PASSWORD)

    expect(new TextDecoder("utf-8", { ignoreBOM: true }).decode(decrypted)).toBe(TEST_STRING)
  })

  it("breaks when decrypting garbage data", async () => {
    const TEST_STRING = generateRandomUnicodeString(20_000)
    const TEST_PASSWORD = "password"

    await expect(decryptData(TEST_STRING, TEST_PASSWORD)).rejects.toThrow("Failed to decrypt data")
  })

  it("changeEncryptedDataPassword zeroes the decrypted data once it is encrypted again", async () => {
    const secret = new Uint8Array(32).fill(7)
    const encrypted = await encryptData(secret, "old-password")

    // the plaintext changeEncryptedDataPassword hands to encryption is the buffer it decrypted
    const encrypt = vi.spyOn(crypto.subtle, "encrypt")
    const reEncrypted = await changeEncryptedDataPassword(encrypted, "old-password", "new-password")
    const plaintext = encrypt.mock.calls[0]?.[2] as Uint8Array
    encrypt.mockRestore()

    expect(plaintext.every((b) => b === 0)).toBe(true)
    expect(await decryptData(reEncrypted, "new-password")).toEqual(secret)
  })
})

// valid code points only: no surrogates, no control characters
const randomCodePoint = () =>
  Math.random() < 0.9
    ? Math.floor(Math.random() * (0xd7ff - 0x0020)) + 0x0020
    : Math.floor(Math.random() * (0x10ffff - 0xe000)) + 0xe000

const generateRandomUnicodeString = (length: number) =>
  Array.from({ length }, () => String.fromCodePoint(randomCodePoint())).join("")
