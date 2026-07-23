import { base64ToBytes, bytesToBase64, bytesToBase64Url } from "@common/base64"
import { beforeEach, describe, expect, test, vi } from "vitest"

import { createBiometricCredential, getBiometricPrfOutput } from "./webauthnPrf"

const create = vi.fn()
const get = vi.fn()
vi.stubGlobal("navigator", { credentials: { create, get } })

const RAW_ID = new Uint8Array([1, 2, 3, 250, 251, 252])
const CREATION_PRF_OUTPUT = new Uint8Array(32).fill(1)
const ASSERTION_PRF_OUTPUT = new Uint8Array(32).fill(2)

// biome-ignore lint/suspicious/noExplicitAny: PRF extension results not in TS types yet
const credential = (prf: any) => ({
  rawId: RAW_ID.buffer,
  getClientExtensionResults: () => ({ prf }),
})

/** the salt the caller passed to the given navigator.credentials call */
// biome-ignore lint/suspicious/noExplicitAny: WebAuthn extension inputs are loosely typed
const prfSaltOf = (call: any) => new Uint8Array(call[0].publicKey.extensions.prf.eval.first)

describe("createBiometricCredential", () => {
  beforeEach(() => {
    create.mockReset()
    get.mockReset()
  })

  test("uses the PRF output returned at creation time", async () => {
    create.mockResolvedValue(credential({ enabled: true, results: { first: CREATION_PRF_OUTPUT } }))

    const result = await createBiometricCredential()

    expect(result.credentialId).toBe(bytesToBase64Url(RAW_ID))
    expect(result.prfOutput).toBe(bytesToBase64(CREATION_PRF_OUTPUT))
    // the salt we report must be the one we evaluated the PRF with
    expect(prfSaltOf(create.mock.calls[0])).toEqual(base64ToBytes(result.prfSalt))
    // no assertion is needed when the authenticator evaluated the PRF during creation
    expect(get).not.toHaveBeenCalled()
  })

  test("falls back to an assertion when creation returns no PRF output", async () => {
    create.mockResolvedValue(credential({ enabled: true }))
    get.mockResolvedValue(credential({ results: { first: ASSERTION_PRF_OUTPUT } }))

    const result = await createBiometricCredential()

    expect(result.prfOutput).toBe(bytesToBase64(ASSERTION_PRF_OUTPUT))
    expect(get).toHaveBeenCalledOnce()

    // the assertion must target the credential we just created, with the same salt
    const [{ publicKey }] = get.mock.calls[0]
    expect(new Uint8Array(publicKey.allowCredentials[0].id)).toEqual(RAW_ID)
    expect(prfSaltOf(get.mock.calls[0])).toEqual(prfSaltOf(create.mock.calls[0]))
  })

  test("rejects an authenticator that does not support PRF", async () => {
    create.mockResolvedValue(credential(undefined))

    await expect(createBiometricCredential()).rejects.toThrow(/does not support biometric unlock/)
    expect(get).not.toHaveBeenCalled()
  })

  test("rejects when the ceremony is cancelled", async () => {
    create.mockRejectedValue(new DOMException("cancelled", "NotAllowedError"))

    await expect(createBiometricCredential()).rejects.toThrow(
      expect.objectContaining({ name: "NotAllowedError" })
    )
  })

  test("forwards the abort signal", async () => {
    create.mockResolvedValue(credential({ enabled: true, results: { first: CREATION_PRF_OUTPUT } }))
    const { signal } = new AbortController()

    await createBiometricCredential(signal)

    expect(create.mock.calls[0][0].signal).toBe(signal)
  })
})

describe("getBiometricPrfOutput", () => {
  beforeEach(() => {
    get.mockReset()
  })

  test("returns the PRF output of the assertion", async () => {
    get.mockResolvedValue(credential({ results: { first: ASSERTION_PRF_OUTPUT } }))

    const prfSalt = bytesToBase64(new Uint8Array(32).fill(3))
    const credentialId = bytesToBase64Url(RAW_ID)

    expect(await getBiometricPrfOutput(credentialId, prfSalt)).toBe(
      bytesToBase64(ASSERTION_PRF_OUTPUT)
    )

    const [{ publicKey }] = get.mock.calls[0]
    expect(new Uint8Array(publicKey.allowCredentials[0].id)).toEqual(RAW_ID)
    expect(prfSaltOf(get.mock.calls[0])).toEqual(base64ToBytes(prfSalt))
  })

  test("rejects when the PRF could not be evaluated", async () => {
    get.mockResolvedValue(credential({ enabled: true }))

    await expect(getBiometricPrfOutput("credId", "c2FsdA==")).rejects.toThrow(
      "PRF evaluation failed"
    )
  })
})
