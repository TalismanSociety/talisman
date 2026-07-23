import { base64 } from "@talismn/crypto"
import { describe, expect, test } from "vitest"

import { decryptPassword, encryptPassword } from "../biometricCrypto"

const randomPrfOutput = () => base64.encode(crypto.getRandomValues(new Uint8Array(32)))

const PASSWORD = "$2a$13$JJqAn9jUJ3P5nSGLpXHrAeaLtGYRR4mMRSDkVtwjBHFcbrPXK1Q1O"

describe("biometricCrypto", () => {
  test("round trips the password", async () => {
    const prfOutput = randomPrfOutput()

    const { encryptedPassword, iv } = await encryptPassword(PASSWORD, prfOutput)
    expect(encryptedPassword).not.toContain(PASSWORD)

    expect(await decryptPassword(encryptedPassword, iv, prfOutput)).toBe(PASSWORD)
  })

  test("fails to decrypt with another PRF output", async () => {
    const { encryptedPassword, iv } = await encryptPassword(PASSWORD, randomPrfOutput())

    await expect(decryptPassword(encryptedPassword, iv, randomPrfOutput())).rejects.toThrow()
  })

  test("fails to decrypt with another iv", async () => {
    const prfOutput = randomPrfOutput()
    const { encryptedPassword } = await encryptPassword(PASSWORD, prfOutput)
    const otherIv = base64.encode(crypto.getRandomValues(new Uint8Array(12)))

    await expect(decryptPassword(encryptedPassword, otherIv, prfOutput)).rejects.toThrow()
  })

  test("uses a fresh iv on every encryption", async () => {
    const prfOutput = randomPrfOutput()

    const first = await encryptPassword(PASSWORD, prfOutput)
    const second = await encryptPassword(PASSWORD, prfOutput)

    expect(first.iv).not.toBe(second.iv)
    expect(first.encryptedPassword).not.toBe(second.encryptedPassword)
  })
})
