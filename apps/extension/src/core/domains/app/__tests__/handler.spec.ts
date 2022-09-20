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

jest.mock("@core/domains/chains/api")
jest.setTimeout(10000)

type SenderFunction<TMessageType extends MessageTypes> = (
  messageType: TMessageType,
  request: RequestTypes[TMessageType],
  id?: string
) => Promise<ResponseTypes[TMessageType]>

const getMessageSenderFn =
  (extension: AppHandler): SenderFunction<MessageTypes> =>
  (messageType, request, id = v4()) =>
    extension.handle(id, messageType, request, {} as chrome.runtime.Port)

describe("Extension", () => {
  let extension: AppHandler
  let state: State
  let messageSender: SenderFunction<MessageTypes>
  const password = "passw0rd " // has a space
  let baseStoreState: Partial<GettableStoreData> = {}
  let accountsJson: KeyringPairs$Json

  async function createExtension(): Promise<AppHandler> {
    await cryptoWaitReady()

    keyring.loadAll({ store: new AccountsStore() })

    state = new State()
    return new AppHandler(state, extensionStores)
  }

  afterAll(async () => {
    await Browser.storage.local.clear()
  })

  beforeAll(async () => {
    await Browser.storage.local.clear()

    extension = await createExtension()
    messageSender = getMessageSenderFn(extension)

    await messageSender("pri(app.onboard)", {
      name: "My Polkadot Account",
      pass: password,
      passConfirm: password,
    })

    baseStoreState = await getLocalStorage()

    accountsJson = await keyring.backupAccounts(
      keyring.getPairs().map((pair) => pair.address),
      await extensionStores.password.transformPassword(password)
    )
  })

  beforeEach(async () => {
    const { seedPhrase, password: passwordStoreData, settings } = baseStoreState
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
    expect(await extensionStores.password.get("isTrimmed"))
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
    expect(await extensionStores.password.get("isTrimmed"))
    // logout then log in again
    await messageSender("pri(app.lock)")
    expect(extensionStores.password.isLoggedIn.value).toBe("FALSE")

    const loginExtraSpaces = await messageSender("pri(app.authenticate)", {
      pass: `  ${password}  `,
    })
    expect(loginExtraSpaces)
    expect(extensionStores.password.isLoggedIn.value).toBe("TRUE")
  })

  test("can not login with password with spaces when isTrimmed is set to false", async () => {
    await extensionStores.password.set({ isTrimmed: false })
    expect(await extensionStores.password.get("isTrimmed")).toBe(false)

    // logout then log in again
    await messageSender("pri(app.lock)")
    expect(extensionStores.password.isLoggedIn.value).toBe("FALSE")

    const loginExtraSpaces = await messageSender("pri(app.authenticate)", {
      pass: `  ${password}  `,
    })
    expect(loginExtraSpaces).toBe(false)
    expect(extensionStores.password.isLoggedIn.value).toBe("FALSE")
  })

  test("can change password to one without spaces", async () => {
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

    expect(newPw).toEqual(await extensionStores.password.transformPassword(newPw))
    // should now be able to unlock a keypair with the plain text pw
    const account = keyring.getAccounts().find(({ meta }) => meta.name === "My Polkadot Account")
    assert(account, "No account")
    expect(account)

    const pairAgain = keyring.getPair(account.address)
    expect(pairAgain.isLocked)
    pairAgain.decodePkcs8(newPw)
    expect(pairAgain.isLocked).toBeFalsy()

    const seedResult = await extensionStores.seedPhrase.getSeed(newPw)
    expect(seedResult.ok && seedResult.val).toBeTruthy()
  })

  test("can change password to one with spaces", async () => {
    expect(await extensionStores.password.get("isTrimmed")).toBe(true)
    await extensionStores.seedPhrase.set({ confirmed: true })

    const newPw = " Spaces "
    const changePassword = await messageSender("pri(app.changePassword)", {
      currentPw: password,
      newPw,
      newPwConfirm: newPw,
    })

    expect(changePassword).toBe(true)
    expect(await extensionStores.password.get("isTrimmed")).toBe(false)

    expect(newPw).toEqual(await extensionStores.password.transformPassword(newPw))
    // should now be able to unlock a keypair with the plain text pw
    const account = keyring.getAccounts().find(({ meta }) => meta.name === "My Polkadot Account")
    assert(account, "No account")
    expect(account)

    const pairAgain = keyring.getPair(account.address)
    expect(pairAgain.isLocked)
    pairAgain.decodePkcs8(newPw)
    expect(pairAgain.isLocked).toBeFalsy()

    const seedResult = await extensionStores.seedPhrase.getSeed(newPw)
    expect(seedResult.ok && seedResult.val).toBeTruthy()
  })
})
