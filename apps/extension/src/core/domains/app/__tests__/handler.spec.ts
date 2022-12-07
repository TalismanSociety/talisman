// import Extension from "./Extension"
import AppHandler from "@core/domains/app/handler"
import State from "@core/handlers/State"
import {
  GettableStoreData,
  extensionStores,
  getLocalStorage,
  setLocalStorage,
} from "@core/handlers/stores"
import { MessageTypes, RequestTypes, ResponseTypes } from "@core/types"
/* eslint-disable no-console */
import { AccountsStore } from "@polkadot/extension-base/stores"
import keyring from "@polkadot/ui-keyring"
import { KeyringPairs$Json } from "@polkadot/ui-keyring/types"
import { assert } from "@polkadot/util"
import { cryptoWaitReady } from "@polkadot/util-crypto"
import { v4 } from "uuid"
import Browser from "webextension-polyfill"

jest.mock("@talismn/chaindata-provider-extension/dist/graphql")
jest.setTimeout(20000)

type SenderFunction<TMessageType extends MessageTypes> = (
  messageType: TMessageType,
  request: RequestTypes[TMessageType],
  id?: string
) => Promise<ResponseTypes[TMessageType]>

const getMessageSenderFn =
  (extension: AppHandler): SenderFunction<MessageTypes> =>
  (messageType, request, id = v4()) =>
    extension.handle(id, messageType, request, {} as chrome.runtime.Port)

keyring.loadAll({ store: new AccountsStore() })

describe("App handler when password is not trimmed", () => {
  let extension: AppHandler
  let state: State
  let messageSender: SenderFunction<MessageTypes>
  const password = "passw0rd " // has a space
  let initialStoreData: Partial<GettableStoreData> = {}
  let accountsJson: KeyringPairs$Json

  async function createExtension(): Promise<AppHandler> {
    await cryptoWaitReady()

    state = new State()
    return new AppHandler(state, extensionStores)
  }

  afterAll(async () => {
    await Browser.storage.local.clear()
  })

  beforeAll(async () => {
    await Browser.storage.local.clear()
    keyring.getPairs().forEach((pair) => keyring.forgetAccount(pair.address))

    extension = await createExtension()
    messageSender = getMessageSenderFn(extension)

    await messageSender("pri(app.onboard)", {
      name: "My Polkadot Account",
      pass: password,
      passConfirm: password,
    })

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
    await messageSender("pri(app.lock)")
    expect(extensionStores.password.isLoggedIn.value).toBe("FALSE")

    const loginExtraSpaces = await messageSender("pri(app.authenticate)", {
      pass: `  ${password}  `,
    })
    expect(loginExtraSpaces).toBe(false)
    expect(extensionStores.password.isLoggedIn.value).toBe("FALSE")
  })

  test("can change password to one without spaces (not trimmed)", async () => {
    expect(await extensionStores.password.get("isTrimmed")).toBe(false)
    // seed phrase store needs to have confirmed === true
    await extensionStores.seedPhrase.set({ confirmed: true })

    const newPw = "noSpaces"
    const changePassword = await messageSender("pri(app.changePassword)", {
      currentPw: password,
      newPw,
      newPwConfirm: newPw,
    })

    expect(changePassword).toBe(true)
    expect(await extensionStores.password.get("isTrimmed")).toBe(false)

    const hashedPw = await extensionStores.password.getHashedPassword(newPw)

    expect(hashedPw).toEqual(await extensionStores.password.transformPassword(newPw))
    // should now be able to unlock a keypair with the plain text pw
    const account = keyring.getAccounts().find(({ meta }) => meta.name === "My Polkadot Account")
    assert(account, "No account")
    expect(account)

    const pairAgain = keyring.getPair(account.address)
    expect(pairAgain.isLocked)
    pairAgain.decodePkcs8(hashedPw)
    expect(pairAgain.isLocked).toBeFalsy()

    const seedResult = await extensionStores.seedPhrase.getSeed(hashedPw)
    expect(seedResult.ok && seedResult.val).toBeTruthy()
  })

  test("can change password to one with spaces (not trimmed)", async () => {
    expect(await extensionStores.password.get("isTrimmed")).toBe(false)
    await extensionStores.seedPhrase.set({ confirmed: true })

    const newPw = " Spaces "
    const changePassword = await messageSender("pri(app.changePassword)", {
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
    const account = keyring.getAccounts().find(({ meta }) => meta.name === "My Polkadot Account")
    assert(account, "No account")
    expect(account)

    const pairAgain = keyring.getPair(account.address)
    expect(pairAgain.isLocked)
    pairAgain.decodePkcs8(hashedPw)
    expect(pairAgain.isLocked).toBeFalsy()

    const seedResult = await extensionStores.seedPhrase.getSeed(hashedPw)
    expect(seedResult.ok && seedResult.val).toBeTruthy()
  })
})

describe("App handler when password is trimmed", () => {
  let extension: AppHandler
  let state: State
  let messageSender: SenderFunction<MessageTypes>
  const password = "passw0rd " // has a space
  let initialStoreData: Partial<GettableStoreData> = {}
  let accountsJson: KeyringPairs$Json

  async function createExtension(): Promise<AppHandler> {
    await cryptoWaitReady()

    state = new State()
    return new AppHandler(state, extensionStores)
  }

  afterAll(async () => {
    await Browser.storage.local.clear()
  })

  beforeAll(async () => {
    await Browser.storage.local.clear()
    keyring.getPairs().forEach((pair) => keyring.forgetAccount(pair.address))

    extension = await createExtension()
    messageSender = getMessageSenderFn(extension)

    await messageSender("pri(app.onboard)", {
      name: "My Polkadot Account",
      pass: password.trim(),
      passConfirm: password.trim(),
    })

    await extensionStores.password.set({ isTrimmed: true })
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
    const login = await messageSender("pri(app.authenticate)", {
      pass: password,
    })
  })

  test("can login with password with spaces when isTrimmed is set to true", async () => {
    expect(await extensionStores.password.get("isTrimmed")).toBe(true)
    // logout then log in again
    await messageSender("pri(app.lock)")
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
    await messageSender("pri(app.lock)")
    expect(extensionStores.password.isLoggedIn.value).toBe("FALSE")

    const loginExtraSpaces = await messageSender("pri(app.authenticate)", {
      pass: `  ${password}  `,
    })
    expect(loginExtraSpaces)
    expect(extensionStores.password.isLoggedIn.value).toBe("TRUE")
  })

  test("can change password to one without spaces (trimmed)", async () => {
    expect(await extensionStores.password.get("isTrimmed")).toBe(true)
    // seed phrase store needs to have confirmed === true
    await extensionStores.seedPhrase.set({ confirmed: true })

    const newPw = "noSpaces"
    const changePassword = await messageSender("pri(app.changePassword)", {
      currentPw: password,
      newPw,
      newPwConfirm: newPw,
    })

    expect(changePassword).toBe(true)
    expect(await extensionStores.password.get("isTrimmed")).toBe(false)

    const hashedPw = await extensionStores.password.getHashedPassword(newPw)
    expect(hashedPw).toEqual(await extensionStores.password.transformPassword(newPw))
    // should now be able to unlock a keypair with the plain text pw
    const account = keyring.getAccounts().find(({ meta }) => meta.name === "My Polkadot Account")
    assert(account, "No account")
    expect(account)

    const pairAgain = keyring.getPair(account.address)
    expect(pairAgain.isLocked)
    pairAgain.decodePkcs8(hashedPw)
    expect(pairAgain.isLocked).toBeFalsy()

    const seedResult = await extensionStores.seedPhrase.getSeed(hashedPw)
    expect(seedResult.ok && seedResult.val).toBeTruthy()
  })

  test("can change password to one with spaces (trimmed)", async () => {
    expect(await extensionStores.password.get("isTrimmed")).toBe(true)
    await extensionStores.seedPhrase.set({ confirmed: true })

    expect(extensionStores.password.isLoggedIn.value).toBe("TRUE")

    const newPw = " Spaces "
    const changePassword = await messageSender("pri(app.changePassword)", {
      currentPw: password,
      newPw,
      newPwConfirm: newPw,
    })

    expect(changePassword).toBe(true)
    expect(await extensionStores.password.get("isTrimmed")).toBe(false)

    const hashedPw = await extensionStores.password.getHashedPassword(newPw)
    expect(hashedPw).toEqual(await extensionStores.password.transformPassword(newPw))
    // should now be able to unlock a keypair with the plain text pw
    const account = keyring.getAccounts().find(({ meta }) => meta.name === "My Polkadot Account")
    assert(account, "No account")
    expect(account)

    const pairAgain = keyring.getPair(account.address)
    expect(pairAgain.isLocked)
    pairAgain.decodePkcs8(hashedPw)
    expect(pairAgain.isLocked).toBeFalsy()

    const seedResult = await extensionStores.seedPhrase.getSeed(hashedPw)
    expect(seedResult.ok && seedResult.val).toBeTruthy()
  })
})
