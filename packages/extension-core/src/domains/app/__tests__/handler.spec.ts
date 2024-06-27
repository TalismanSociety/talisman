/* eslint-disable no-console */
import { AccountsStore } from "@polkadot/extension-base/stores"
import keyring from "@polkadot/ui-keyring"
import { KeyringPairs$Json } from "@polkadot/ui-keyring/types"
import { assert } from "@polkadot/util"
import { cryptoWaitReady } from "@polkadot/util-crypto"
import { watCryptoWaitReady } from "@talismn/scale"

import { getMessageSenderFn } from "../../../../tests/util"
import Extension from "../../../handlers/Extension"
import {
  GettableStoreData,
  extensionStores,
  getLocalStorage,
  setLocalStorage,
} from "../../../handlers/stores"

jest.setTimeout(20_000)
jest.mock("../../../util/isBackgroundPage", () => ({
  isBackgroundPage: jest.fn().mockResolvedValue(true),
}))

keyring.loadAll({ store: new AccountsStore() })

describe("App handler when password is not trimmed", () => {
  let extension: Extension
  let messageSender: ReturnType<typeof getMessageSenderFn>
  const suri = "seed sock milk update focus rotate barely fade car face mechanic mercy"
  const password = "passw0rd " // has a space
  let initialStoreData: Partial<GettableStoreData> = {}
  let accountsJson: KeyringPairs$Json

  let mnemonicId: string

  async function createExtension(): Promise<Extension> {
    await Promise.all([
      // wait for `@polkadot/util-crypto` to be ready (it needs to load some wasm)
      cryptoWaitReady(),
      // wait for `@talismn/scale` to be ready (it needs to load some wasm)
      watCryptoWaitReady(),
    ])

    return new Extension(extensionStores)
  }

  afterAll(async () => {
    await chrome.storage.local.clear()
  })

  beforeAll(async () => {
    await chrome.storage.local.clear()

    keyring.getPairs().forEach((pair) => keyring.forgetAccount(pair.address))

    extension = await createExtension()
    const port = chrome.runtime.connect("talismanTest")
    messageSender = getMessageSenderFn(extension, port)

    await messageSender("pri(app.onboardCreatePassword)", {
      pass: password,
      passConfirm: password,
    })

    await messageSender("pri(accounts.create)", {
      name: "Test Polkadot Account",
      type: "sr25519",
      mnemonic: suri,
      confirmed: false,
    })

    mnemonicId = Object.keys(await extensionStores.mnemonics.get())[0]
    initialStoreData = await getLocalStorage()

    accountsJson = await keyring.backupAccounts(
      keyring.getPairs().map((pair) => pair.address),
      await extensionStores.password.transformPassword(password)
    )
  })

  beforeEach(async () => {
    const { seedPhrase, password: passwordStoreData, settings } = initialStoreData
    await setLocalStorage({ seedPhrase, password: passwordStoreData, settings })
    extensionStores.password.clearPassword()

    keyring.restoreAccounts(
      accountsJson,
      await extensionStores.password.transformPassword(password)
    )
    await messageSender("pri(app.authenticate)", {
      pass: password,
    })
  })

  test("can not login with password with spaces when isTrimmed is set to false", async () => {
    const { isHashed, isTrimmed } = await extensionStores.password.get()
    expect(isTrimmed).toBe(false)
    expect(isHashed).toBe(true)
    expect(extensionStores.password.isLoggedIn.value).toBe("TRUE")

    expect(await extensionStores.password.getPassword()).toBe(
      await extensionStores.password.getHashedPassword(password)
    )

    // logout then log in again
    await messageSender("pri(app.lock)", null)
    expect(extensionStores.password.isLoggedIn.value).toBe("FALSE")

    const loginExtraSpaces = await messageSender("pri(app.authenticate)", {
      pass: `  ${password}  `,
    })
    expect(loginExtraSpaces).toBe(false)
    expect(extensionStores.password.isLoggedIn.value).toBe("FALSE")
  })

  test("can change password to one without spaces (not trimmed)", async () => {
    expect(await extensionStores.password.get("isTrimmed")).toBe(false)
    // mnemonic store needs to have confirmed === true
    await extensionStores.mnemonics.setConfirmed(mnemonicId, true)

    const newPw = "noSpaces"
    const changePassword = await messageSender("pri(app.changePassword.subscribe)", {
      currentPw: password,
      newPw,
      newPwConfirm: newPw,
    })

    expect(changePassword).toBe(true)
    expect(await extensionStores.password.get("isTrimmed")).toBe(false)

    const hashedPw = await extensionStores.password.getHashedPassword(newPw)

    expect(hashedPw).toEqual(await extensionStores.password.transformPassword(newPw))
    // should now be able to unlock a keypair with the plain text pw
    const account = keyring.getAccounts().find(({ meta }) => meta.name === "Test Polkadot Account")
    assert(account, "No account")
    expect(account)

    const pairAgain = keyring.getPair(account.address)
    expect(pairAgain.isLocked)
    pairAgain.decodePkcs8(hashedPw)
    expect(pairAgain.isLocked).toBeFalsy()

    const seedResult = await extensionStores.mnemonics.getMnemonic(mnemonicId, hashedPw)
    expect(seedResult.ok && seedResult.val).toBeTruthy()
  })

  test("can change password to one with spaces (not trimmed)", async () => {
    expect(await extensionStores.password.get("isTrimmed")).toBe(false)
    await extensionStores.mnemonics.setConfirmed(mnemonicId, true)

    const newPw = " Spaces "
    const changePassword = await messageSender("pri(app.changePassword.subscribe)", {
      currentPw: password,
      newPw,
      newPwConfirm: newPw,
    })

    expect(changePassword).toBe(true)
    expect(await extensionStores.password.get("isTrimmed")).toBe(false)
    expect(await extensionStores.password.get("isHashed")).toBe(true)

    const hashedPw = await extensionStores.password.getHashedPassword(newPw)
    expect(hashedPw).toEqual(await extensionStores.password.transformPassword(newPw))
    // should now be able to unlock a keypair with the plain text pw
    const account = keyring.getAccounts().find(({ meta }) => meta.name === "Test Polkadot Account")
    assert(account, "No account")
    expect(account)

    const pairAgain = keyring.getPair(account.address)
    expect(pairAgain.isLocked)
    pairAgain.decodePkcs8(hashedPw)
    expect(pairAgain.isLocked).toBeFalsy()

    const seedResult = await extensionStores.mnemonics.getMnemonic(mnemonicId, hashedPw)
    expect(seedResult.ok && seedResult.val).toBeTruthy()
  })
})

describe("App handler when password is trimmed", () => {
  let extension: Extension
  let messageSender: ReturnType<typeof getMessageSenderFn>
  const suri = "seed sock milk update focus rotate barely fade car face mechanic mercy"
  const password = "passw0rd " // has a space
  let initialStoreData: Partial<GettableStoreData> = {}
  let accountsJson: KeyringPairs$Json
  let mnemonicId: string

  async function createExtension(): Promise<Extension> {
    await Promise.all([
      // wait for `@polkadot/util-crypto` to be ready (it needs to load some wasm)
      cryptoWaitReady(),
      // wait for `@talismn/scale` to be ready (it needs to load some wasm)
      watCryptoWaitReady(),
    ])

    return new Extension(extensionStores)
  }

  afterAll(async () => {
    await chrome.storage.local.clear()
  })

  beforeAll(async () => {
    await chrome.storage.local.clear()
    keyring.getPairs().forEach((pair) => keyring.forgetAccount(pair.address))

    extension = await createExtension()
    const port = chrome.runtime.connect("talismanTest")
    messageSender = getMessageSenderFn(extension, port)

    await messageSender("pri(app.onboardCreatePassword)", {
      pass: password.trim(),
      passConfirm: password.trim(),
    })

    await extensionStores.password.set({ isTrimmed: true })

    await messageSender("pri(accounts.create)", {
      name: "Test Polkadot Account",
      type: "sr25519",
      mnemonic: suri,
      confirmed: false,
    })

    mnemonicId = Object.keys(await extensionStores.mnemonics.get())[0]

    await extensionStores.app.setOnboarded()

    initialStoreData = await getLocalStorage()

    accountsJson = await keyring.backupAccounts(
      keyring.getPairs().map((pair) => pair.address),
      await extensionStores.password.transformPassword(password)
    )
  })

  beforeEach(async () => {
    const { seedPhrase, password: passwordStoreData, settings } = initialStoreData

    await setLocalStorage({ seedPhrase, password: passwordStoreData, settings })
    extensionStores.password.clearPassword()

    keyring.restoreAccounts(
      accountsJson,
      await extensionStores.password.transformPassword(password)
    )
    await messageSender("pri(app.authenticate)", {
      pass: password,
    })
  })

  test("can login with password with spaces when isTrimmed is set to true", async () => {
    expect(await extensionStores.password.get("isTrimmed")).toBe(true)
    // logout then log in again
    await messageSender("pri(app.lock)", null)
    expect(extensionStores.password.isLoggedIn.value).toBe("FALSE")

    const login = await messageSender("pri(app.authenticate)", {
      pass: password,
    })
    expect(login)
    expect(extensionStores.password.isLoggedIn.value).toBe("TRUE")
  })

  test("can login with password with additional spaces when isTrimmed is set to true", async () => {
    expect(await extensionStores.password.get("isTrimmed")).toBe(true)
    // logout then log in again
    await messageSender("pri(app.lock)", null)
    expect(extensionStores.password.isLoggedIn.value).toBe("FALSE")

    const loginExtraSpaces = await messageSender("pri(app.authenticate)", {
      pass: `  ${password}  `,
    })
    expect(loginExtraSpaces)
    expect(extensionStores.password.isLoggedIn.value).toBe("TRUE")
  })

  test("can change password to one without spaces (trimmed)", async () => {
    expect(await extensionStores.password.get("isTrimmed")).toBe(true)
    // mnemonic store needs to have confirmed === true
    await extensionStores.mnemonics.setConfirmed(mnemonicId, true)

    const newPw = "noSpaces"
    const changePassword = await messageSender("pri(app.changePassword.subscribe)", {
      currentPw: password,
      newPw,
      newPwConfirm: newPw,
    })

    expect(changePassword).toBe(true)
    expect(await extensionStores.password.get("isTrimmed")).toBe(false)

    const hashedPw = await extensionStores.password.getHashedPassword(newPw)
    expect(hashedPw).toEqual(await extensionStores.password.transformPassword(newPw))
    // should now be able to unlock a keypair with the plain text pw
    const account = keyring.getAccounts().find(({ meta }) => meta.name === "Test Polkadot Account")
    assert(account, "No account")
    expect(account)

    const pairAgain = keyring.getPair(account.address)
    expect(pairAgain.isLocked)
    pairAgain.decodePkcs8(hashedPw)
    expect(pairAgain.isLocked).toBeFalsy()

    const seedResult = await extensionStores.mnemonics.getMnemonic(mnemonicId, hashedPw)
    expect(seedResult.ok && seedResult.val).toBeTruthy()
  })

  test("can change password to one with spaces (trimmed)", async () => {
    expect(await extensionStores.password.get("isTrimmed")).toBe(true)
    await extensionStores.mnemonics.setConfirmed(mnemonicId, true)

    expect(extensionStores.password.isLoggedIn.value).toBe("TRUE")

    const newPw = " Spaces "
    const changePassword = await messageSender("pri(app.changePassword.subscribe)", {
      currentPw: password,
      newPw,
      newPwConfirm: newPw,
    })

    expect(changePassword).toBe(true)
    expect(await extensionStores.password.get("isTrimmed")).toBe(false)

    const hashedPw = await extensionStores.password.getHashedPassword(newPw)
    expect(hashedPw).toEqual(await extensionStores.password.transformPassword(newPw))
    // should now be able to unlock a keypair with the plain text pw
    const account = keyring.getAccounts().find(({ meta }) => meta.name === "Test Polkadot Account")
    assert(account, "No account")
    expect(account)

    const pairAgain = keyring.getPair(account.address)
    expect(pairAgain.isLocked)
    pairAgain.decodePkcs8(hashedPw)
    expect(pairAgain.isLocked).toBeFalsy()

    const seedResult = await extensionStores.mnemonics.getMnemonic(mnemonicId, hashedPw)
    expect(seedResult.ok && seedResult.val).toBeTruthy()
  })
})
