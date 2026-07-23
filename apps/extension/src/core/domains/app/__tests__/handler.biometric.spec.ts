import { base64 } from "@talismn/crypto"
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest"

import { getMessageSenderFn } from "../../../../../tests/core/util"
import Extension from "../../../handlers/Extension"
import { extensionStores, type GettableStoreData, getLocalStorage } from "../../../handlers/stores"
import { keyringStore } from "../../keyring/store"

vi.setConfig({ testTimeout: 20_000 })

const randomPrfOutput = () => base64.encode(crypto.getRandomValues(new Uint8Array(32)))

const enrollRequest = (prfOutput: string) => ({
  credentialId: "Y3JlZGVudGlhbElk",
  prfSalt: base64.encode(new Uint8Array(32).fill(7)),
  prfOutput,
})

describe("App handler biometric unlock", () => {
  let extension: Extension
  let messageSender: ReturnType<typeof getMessageSenderFn>
  const mnemonic = "seed sock milk update focus rotate barely fade car face mechanic mercy"
  const password = "passw0rd"
  let initialStoreData: Partial<GettableStoreData> = {}
  let mnemonicId: string

  afterAll(async () => {
    await chrome.storage.local.clear()
  })

  beforeAll(async () => {
    await chrome.storage.local.clear()
    await keyringStore.reset()

    extension = new Extension(extensionStores)
    messageSender = getMessageSenderFn(extension, chrome.runtime.connect("talismanTest"))

    await messageSender("pri(app.onboardCreatePassword)", {
      pass: password,
      passConfirm: password,
    })

    await messageSender("pri(accounts.add.derive)", [
      {
        type: "new-mnemonic",
        mnemonic,
        mnemonicName: "Test Mnemonic",
        derivationPath: "",
        name: "Test Polkadot Account",
        curve: "sr25519",
        confirmed: false,
      },
    ])

    mnemonicId = (await keyringStore.getExistingMnemonicId(mnemonic)) as string
    initialStoreData = await getLocalStorage()
  })

  beforeEach(async () => {
    await extensionStores.password.set(initialStoreData.password ?? {})
    await extensionStores.biometric.unenroll()
    extensionStores.password.clearPassword()
    await messageSender("pri(app.authenticate)", { pass: password })
  })

  test("cannot enroll while logged out", async () => {
    await messageSender("pri(app.lock)", null)

    await expect(
      messageSender("pri(app.biometric.enroll)", enrollRequest(randomPrfOutput()))
    ).rejects.toThrow("Must be logged in to enroll biometric")

    expect(await messageSender("pri(app.biometric.getCredentialInfo)", null)).toBeNull()
  })

  test("cannot enroll without an auth secret", async () => {
    // legacy accounts only get their auth secret on their next login
    await extensionStores.password.set({ secret: undefined, check: undefined })

    await expect(
      messageSender("pri(app.biometric.enroll)", enrollRequest(randomPrfOutput()))
    ).rejects.toThrow("Please log in again before enabling biometric unlock")
  })

  test("unlocks the wallet with the enrolled PRF output", async () => {
    const prfOutput = randomPrfOutput()
    expect(await messageSender("pri(app.biometric.enroll)", enrollRequest(prfOutput))).toBe(true)

    await messageSender("pri(app.lock)", null)
    expect(extensionStores.password.isLoggedIn.value).toBe("FALSE")

    expect(await messageSender("pri(app.biometric.authenticate)", { prfOutput })).toBe(true)
    expect(extensionStores.password.isLoggedIn.value).toBe("TRUE")
    expect(await extensionStores.password.getPassword()).toBe(
      await extensionStores.password.getHashedPassword(password)
    )
  })

  test("only exposes the public part of the enrollment", async () => {
    const request = enrollRequest(randomPrfOutput())
    await messageSender("pri(app.biometric.enroll)", request)

    expect(await messageSender("pri(app.biometric.getCredentialInfo)", null)).toEqual({
      credentialId: request.credentialId,
      prfSalt: request.prfSalt,
    })
  })

  test("stays locked and clears the enrollment on a wrong PRF output", async () => {
    await messageSender("pri(app.biometric.enroll)", enrollRequest(randomPrfOutput()))
    await messageSender("pri(app.lock)", null)

    expect(
      await messageSender("pri(app.biometric.authenticate)", { prfOutput: randomPrfOutput() })
    ).toBe(false)

    expect(extensionStores.password.isLoggedIn.value).toBe("FALSE")
    expect(await messageSender("pri(app.biometric.getCredentialInfo)", null)).toBeNull()
  })

  test("keeps the session and the enrollment when called while already unlocked", async () => {
    await messageSender("pri(app.biometric.enroll)", enrollRequest(randomPrfOutput()))

    expect(
      await messageSender("pri(app.biometric.authenticate)", { prfOutput: randomPrfOutput() })
    ).toBe(true)

    expect(extensionStores.password.isLoggedIn.value).toBe("TRUE")
    expect(await messageSender("pri(app.biometric.getCredentialInfo)", null)).not.toBeNull()
  })

  test("does not unlock when not enrolled", async () => {
    await messageSender("pri(app.lock)", null)

    expect(
      await messageSender("pri(app.biometric.authenticate)", { prfOutput: randomPrfOutput() })
    ).toBe(false)
    expect(extensionStores.password.isLoggedIn.value).toBe("FALSE")
  })

  test("clears the enrollment when the password changes", async () => {
    await messageSender("pri(app.biometric.enroll)", enrollRequest(randomPrfOutput()))

    // mnemonic store needs to have confirmed === true or password cannot be changed
    await keyringStore.updateMnemonic(mnemonicId, { confirmed: true })
    const newPw = "newPassw0rd"
    expect(
      await messageSender("pri(app.changePassword.subscribe)", {
        currentPw: password,
        newPw,
        newPwConfirm: newPw,
      })
    ).toBe(true)

    expect(await messageSender("pri(app.biometric.getCredentialInfo)", null)).toBeNull()
  })

  test("unenroll clears the enrollment", async () => {
    await messageSender("pri(app.biometric.enroll)", enrollRequest(randomPrfOutput()))

    expect(await messageSender("pri(app.biometric.unenroll)", null)).toBe(true)
    expect(await messageSender("pri(app.biometric.getCredentialInfo)", null)).toBeNull()
  })

  test("cannot unenroll while logged out", async () => {
    await messageSender("pri(app.biometric.enroll)", enrollRequest(randomPrfOutput()))
    await messageSender("pri(app.lock)", null)

    await expect(messageSender("pri(app.biometric.unenroll)", null)).rejects.toThrow(
      "Must be logged in to disable biometric unlock"
    )
    expect(await messageSender("pri(app.biometric.getCredentialInfo)", null)).not.toBeNull()
  })
})
