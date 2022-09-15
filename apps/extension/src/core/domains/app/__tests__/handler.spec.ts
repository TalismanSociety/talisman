// import Extension from "./Extension"
import AppHandler from "@core/domains/app/handler"
import State from "@core/handlers/State"
import { extensionStores } from "@core/handlers/stores"
import { MessageTypes, RequestTypes, ResponseTypes } from "@core/types"
/* eslint-disable no-console */
import { AccountsStore } from "@polkadot/extension-base/stores"
import keyring from "@polkadot/ui-keyring"
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
  const suri = "seed sock milk update focus rotate barely fade car face mechanic mercy"
  const password = "passw0rd " // has a space

  async function createExtension(): Promise<AppHandler> {
    await cryptoWaitReady()

    keyring.loadAll({ store: new AccountsStore() })

    extensionStores.sites.set({
      "localhost:3000": {
        addresses: [],
        id: "11",
        origin: "example.com",
        url: "http://localhost:3000",
      },
    })
    state = new State()
    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */

    return new AppHandler(state, extensionStores)
  }

  beforeAll(async () => {
    await Browser.storage.local.clear()
    extension = await createExtension()
    messageSender = getMessageSenderFn(extension)

    await messageSender("pri(app.onboard)", {
      name: "testRootAccount",
      pass: password,
      passConfirm: password,
    })
  })

  beforeEach(async () => {
    await messageSender("pri(app.authenticate)", {
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
    // set trimming back to true for the other tests
    await extensionStores.password.set({ isTrimmed: true })
  })

  test("can login with trimmed password when isTrimmed is set to false", async () => {
    await extensionStores.password.set({ isTrimmed: false })
    expect(await extensionStores.password.get("isTrimmed")).toBe(false)

    // logout then log in again
    await messageSender("pri(app.lock)")
    expect(extensionStores.password.isLoggedIn.value).toBe("FALSE")

    const loginExtraSpaces = await messageSender("pri(app.authenticate)", {
      pass: password.trim(),
    })
    expect(loginExtraSpaces).toBe(true)
    expect(extensionStores.password.isLoggedIn.value).toBe("TRUE")
    // set trimming back to true for the other tests
    await extensionStores.password.set({ isTrimmed: true })
  })

  test("can change password", async () => {
    expect(await extensionStores.password.get("isTrimmed")).toBe(true)
    // seed phrase store needs to have confirmed === true
    await extensionStores.seedPhrase.set({ confirmed: true })
    // create a keypair

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
    const account = keyring.getAccounts().find(({ meta }) => meta.name === "testRootAccount")
    assert(account, "No account")
    expect(account)

    const pairAgain = keyring.getPair(account.address)
    expect(pairAgain.isLocked)
    pairAgain.decodePkcs8(newPw)
    expect(pairAgain.isLocked).toBeFalsy()
  })
})
