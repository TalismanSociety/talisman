import { base64, base64urlnopad } from "@talismn/crypto"
import { beforeEach, describe, expect, test, vi } from "vitest"

import { createBiometricCredential, getBiometricPrfOutput, PrfEvaluationError } from "./webauthnPrf"

const create = vi.fn()
const get = vi.fn()
const signalUnknownCredential = vi.fn()
vi.stubGlobal("navigator", { credentials: { create, get } })
vi.stubGlobal("PublicKeyCredential", { signalUnknownCredential })

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
    signalUnknownCredential.mockReset()
  })

  test("uses the PRF output returned at creation time", async () => {
    create.mockResolvedValue(credential({ enabled: true, results: { first: CREATION_PRF_OUTPUT } }))

    const result = await createBiometricCredential()

    expect(result.credentialId).toBe(base64urlnopad.encode(RAW_ID))
    expect(result.prfOutput).toBe(base64.encode(CREATION_PRF_OUTPUT))
    // the salt we report must be the one we evaluated the PRF with
    expect(prfSaltOf(create.mock.calls[0])).toEqual(base64.decode(result.prfSalt))
    // no assertion is needed when the authenticator evaluated the PRF during creation
    expect(get).not.toHaveBeenCalled()
  })

  test("falls back to an assertion when creation returns no PRF output", async () => {
    create.mockResolvedValue(credential({ enabled: true }))
    get.mockResolvedValue(credential({ results: { first: ASSERTION_PRF_OUTPUT } }))

    const result = await createBiometricCredential()

    expect(result.prfOutput).toBe(base64.encode(ASSERTION_PRF_OUTPUT))
    expect(get).toHaveBeenCalledOnce()

    // the assertion must target the credential we just created, with the same salt
    const [{ publicKey }] = get.mock.calls[0]
    expect(new Uint8Array(publicKey.allowCredentials[0].id)).toEqual(RAW_ID)
    expect(prfSaltOf(get.mock.calls[0])).toEqual(prfSaltOf(create.mock.calls[0]))
  })

  test("falls back to an assertion when creation reports no PRF support at all", async () => {
    // windows hello on chrome 146 and below: nothing on create, PRF evaluated on assertion
    create.mockResolvedValue(credential(undefined))
    get.mockResolvedValue(credential({ results: { first: ASSERTION_PRF_OUTPUT } }))

    const result = await createBiometricCredential()

    expect(result.prfOutput).toBe(base64.encode(ASSERTION_PRF_OUTPUT))
    expect(get).toHaveBeenCalledOnce()
    expect(signalUnknownCredential).not.toHaveBeenCalled()
  })

  test("rejects an authenticator that does not support PRF, and drops its credential", async () => {
    create.mockResolvedValue(credential(undefined))
    get.mockResolvedValue(credential({ enabled: true }))

    await expect(createBiometricCredential()).rejects.toThrow(/does not support biometric unlock/)
    expect(signalUnknownCredential).toHaveBeenCalledWith(
      expect.objectContaining({ credentialId: base64urlnopad.encode(RAW_ID) })
    )
  })

  test("drops the credential when the fallback assertion fails", async () => {
    create.mockResolvedValue(credential({ enabled: true }))
    get.mockRejectedValue(new DOMException("cancelled", "NotAllowedError"))

    await expect(createBiometricCredential()).rejects.toThrow(
      expect.objectContaining({ name: "NotAllowedError" })
    )
    expect(signalUnknownCredential).toHaveBeenCalledWith(
      expect.objectContaining({ credentialId: base64urlnopad.encode(RAW_ID) })
    )
  })

  test("keeps the credential when the ceremony succeeds", async () => {
    create.mockResolvedValue(credential({ enabled: true, results: { first: CREATION_PRF_OUTPUT } }))

    await createBiometricCredential()

    expect(signalUnknownCredential).not.toHaveBeenCalled()
  })

  test("rejects when the ceremony is cancelled", async () => {
    create.mockRejectedValue(new DOMException("cancelled", "NotAllowedError"))

    await expect(createBiometricCredential()).rejects.toThrow(
      expect.objectContaining({ name: "NotAllowedError" })
    )
    // no credential was created, there is nothing to clean up
    expect(signalUnknownCredential).not.toHaveBeenCalled()
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

    const prfSalt = base64.encode(new Uint8Array(32).fill(3))
    const credentialId = base64urlnopad.encode(RAW_ID)

    expect(await getBiometricPrfOutput(credentialId, prfSalt)).toBe(
      base64.encode(ASSERTION_PRF_OUTPUT)
    )

    const [{ publicKey }] = get.mock.calls[0]
    expect(new Uint8Array(publicKey.allowCredentials[0].id)).toEqual(RAW_ID)
    expect(prfSaltOf(get.mock.calls[0])).toEqual(base64.decode(prfSalt))
  })

  test("rejects when the PRF could not be evaluated", async () => {
    get.mockResolvedValue(credential({ enabled: true }))

    await expect(getBiometricPrfOutput(base64urlnopad.encode(RAW_ID), "c2FsdA==")).rejects.toThrow(
      PrfEvaluationError
    )
  })
})
