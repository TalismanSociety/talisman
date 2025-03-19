import { decryptData, encryptData } from "./encryption"

describe("encryption", () => {
  it("encrypt/decrypt short string", async () => {
    const TEST_STRING = "hello world"
    const TEST_PASSWORD = "password"

    const encrypted = await encryptData(new TextEncoder().encode(TEST_STRING), TEST_PASSWORD)
    const decrypted = await decryptData(encrypted, TEST_PASSWORD)

    expect(decrypted).toEqual(new TextEncoder().encode(TEST_STRING))
  })

  it("encrypt/decrypt long string", async () => {
    const TEST_STRING = generateRandomUnicodeString(20_000)
    const TEST_PASSWORD = "password"

    const encrypted = await encryptData(new TextEncoder().encode(TEST_STRING), TEST_PASSWORD)
    const decrypted = await decryptData(encrypted, TEST_PASSWORD)

    expect(decrypted).toEqual(new TextEncoder().encode(TEST_STRING))
  })

  it("breaks when decrypting garbage data", async () => {
    const TEST_STRING = generateRandomUnicodeString(20_000)
    const TEST_PASSWORD = "password"

    await expect(decryptData(TEST_STRING, TEST_PASSWORD)).rejects.toThrow("Failed to decrypt data")
  })
})

const generateRandomUnicodeString = (length: number) => {
  const result = new Array(length)
  for (let i = 0; i < length; i++) {
    let randomCodePoint

    // Generate a valid Unicode character, avoiding surrogate pairs and control characters
    if (Math.random() < 0.9) {
      // 90% chance: Pick from common BMP (Basic Multilingual Plane)
      randomCodePoint = Math.floor(Math.random() * (0xd7ff - 0x0020)) + 0x0020
    } else {
      // 10% chance: Pick from Supplementary Planes (excluding surrogates)
      randomCodePoint = Math.floor(Math.random() * (0x10ffff - 0xe000)) + 0xe000
    }

    result[i] = String.fromCodePoint(randomCodePoint)
  }
  return result.join("")
}
