/* eslint-disable no-console */
import { assert } from "@polkadot/util"
import { KeyringStorage } from "@talismn/keyring"

import { getMessageSenderFn } from "../../../../tests/util"
import Extension from "../../../handlers/Extension"
import {
  extensionStores,
  getLocalStorage,
  GettableStoreData,
  setLocalStorage,
} from "../../../handlers/stores"
import { keyringStore } from "../../keyring/store"

jest.setTimeout(20_000)

describe("App handler when password is not trimmed", () => {
  let extension: Extension
  let messageSender: ReturnType<typeof getMessageSenderFn>
  const mnemonic = "seed sock milk update focus rotate barely fade car face mechanic mercy"
  const password = "passw0rd " // has a space
  let initialStoreData: Partial<GettableStoreData> = {}
  let keyringBackupJson: KeyringStorage
  let mnemonicId: string

  async function createExtension(): Promise<Extension> {
    return new Extension(extensionStores)
  }

  afterAll(async () => {
    await chrome.storage.local.clear()
  })

  beforeAll(async () => {
    await chrome.storage.local.clear()
    await keyringStore.reset()

    extension = await createExtension()
    const port = chrome.runtime.connect("talismanTest")
    messageSender = getMessageSenderFn(extension, port)

    await messageSender("pri(app.onboardCreatePassword)", {
      pass: password,
      passConfirm: password,
    })

    await messageSender("pri(accounts.add.derive)", [
      {
        type: "new-mnemonic",
        mnemonic: mnemonic,
        mnemonicName: "Test Mnemonic",
        derivationPath: "",
        name: "Test Polkadot Account",
        curve: "sr25519",
        confirmed: false,
      },
    ])

    mnemonicId = (await keyringStore.getExistingMnemonicId(mnemonic)) as string

    initialStoreData = await getLocalStorage()

    keyringBackupJson = await keyringStore.backup(
      await extensionStores.password.transformPassword(password),
      password,
    )
  })

  beforeEach(async () => {
    const { password: passwordStoreData, settings } = initialStoreData
    await setLocalStorage({ password: passwordStoreData, settings })
    extensionStores.password.clearPassword()

    await keyringStore.restore(
      keyringBackupJson,
      password,
      await extensionStores.password.transformPassword(password),
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
      await extensionStores.password.getHashedPassword(password),
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

  test("cannot change password if mnemonic is not confirmed", async () => {
    const newPw = "noSpaces"
    const changePasswordAttempt = await messageSender("pri(app.changePassword.subscribe)", {
      currentPw: password,
      newPw,
      newPwConfirm: newPw,
    })

    expect(changePasswordAttempt).toBe(false)
  })

  test("can change password to one without spaces (not trimmed)", async () => {
    expect(await extensionStores.password.get("isTrimmed")).toBe(false)
    // mnemonic store needs to have confirmed === true or password cannot be changed
    await keyringStore.updateMnemonic(mnemonicId, { confirmed: true })

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
    const accounts = await keyringStore.getAccounts()
    const account = accounts.find(({ name }) => name === "Test Polkadot Account")
    assert(account, "No account")
    expect(account)

    const secretKey = await keyringStore.getAccountSecretKey(account.address, hashedPw)
    expect(secretKey).toBeTruthy()

    const mnemonic = await keyringStore.getMnemonicText(mnemonicId, hashedPw)
    expect(mnemonic).toEqual(mnemonic)
  })

  test("can change password to one with spaces (not trimmed)", async () => {
    expect(await extensionStores.password.get("isTrimmed")).toBe(false)
    await keyringStore.updateMnemonic(mnemonicId, { confirmed: true })

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
    const accounts = await keyringStore.getAccounts()
    const account = accounts.find(({ name }) => name === "Test Polkadot Account")
    assert(account, "No account")
    expect(account)

    const exported = await keyringStore.getAccountSecretKey(account.address, hashedPw)
    expect(exported).toBeTruthy()

    const mnemonic = await keyringStore.getMnemonicText(mnemonicId, hashedPw)
    expect(mnemonic).toEqual(mnemonic)
  })
})

describe("App handler when password is trimmed", () => {
  let extension: Extension
  let messageSender: ReturnType<typeof getMessageSenderFn>
  const mnemonic = "seed sock milk update focus rotate barely fade car face mechanic mercy"
  const password = "passw0rd " // has a space
  let initialStoreData: Partial<GettableStoreData> = {}
  let keyringBackupJson: KeyringStorage
  let mnemonicId: string

  async function createExtension(): Promise<Extension> {
    return new Extension(extensionStores)
  }

  afterAll(async () => {
    await chrome.storage.local.clear()
  })

  beforeAll(async () => {
    await chrome.storage.local.clear()
    await keyringStore.reset()

    extension = await createExtension()
    const port = chrome.runtime.connect("talismanTest")
    messageSender = getMessageSenderFn(extension, port)

    await messageSender("pri(app.onboardCreatePassword)", {
      pass: password.trim(),
      passConfirm: password.trim(),
    })

    await extensionStores.password.set({ isTrimmed: true })

    await messageSender("pri(accounts.add.derive)", [
      {
        type: "new-mnemonic",
        mnemonic: mnemonic,
        mnemonicName: "Test Mnemonic",
        derivationPath: "",
        name: "Test Polkadot Account",
        curve: "sr25519",
        confirmed: false,
      },
    ])

    mnemonicId = (await keyringStore.getExistingMnemonicId(mnemonic)) as string

    await extensionStores.app.setOnboarded()

    initialStoreData = await getLocalStorage()

    keyringBackupJson = await keyringStore.backup(
      await extensionStores.password.transformPassword(password),
      password,
    )
  })

  beforeEach(async () => {
    const { password: passwordStoreData, settings } = initialStoreData
    await setLocalStorage({ password: passwordStoreData, settings })
    extensionStores.password.clearPassword()

    await keyringStore.restore(
      keyringBackupJson,
      password,
      await extensionStores.password.transformPassword(password),
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
    await keyringStore.updateMnemonic(mnemonicId, { confirmed: true })

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
    const accounts = await keyringStore.getAccounts()
    const account = accounts.find(({ name }) => name === "Test Polkadot Account")
    assert(account, "No account")
    expect(account)

    const secretKey = await keyringStore.getAccountSecretKey(account.address, hashedPw)
    expect(secretKey).toBeTruthy()

    const mnemonic = await keyringStore.getMnemonicText(mnemonicId, hashedPw)
    expect(mnemonic).toEqual(mnemonic)
  })

  test("can change password to one with spaces (trimmed)", async () => {
    expect(await extensionStores.password.get("isTrimmed")).toBe(true)
    await keyringStore.updateMnemonic(mnemonicId, { confirmed: true })

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
    const accounts = await keyringStore.getAccounts()
    const account = accounts.find(({ name }) => name === "Test Polkadot Account")
    assert(account, "No account")
    expect(account)

    const secretKey = await keyringStore.getAccountSecretKey(account.address, hashedPw)
    expect(secretKey).toBeTruthy()

    const mnemonic = await keyringStore.getMnemonicText(mnemonicId, hashedPw)
    expect(mnemonic).toEqual(mnemonic)
  })
})
