import { PasswordStore } from "@core/domains/app/store.password"
import Browser from "webextension-polyfill"

const spaceyPw = "  passWord  "
const pwStoreInitial = { isTrimmed: true }

describe("Test password store", () => {
  afterEach(async () => {
    await Browser.storage.local.clear()
  })

  test("setting isTrimmed false ensures passwords with spaces are not trimmed", async () => {
    const passwordStore = new PasswordStore("password", pwStoreInitial)
    await passwordStore.set({ isTrimmed: false })
    passwordStore.setPassword(spaceyPw)
    const returnedPw = await passwordStore.getPassword()
    expect(returnedPw).toEqual(spaceyPw)
  })

  test("setting isTrimmed true ensures passwords with spaces are trimmed", async () => {
    const passwordStore = new PasswordStore("password", pwStoreInitial)
    expect(await passwordStore.get("isTrimmed")).toBe(true)
    passwordStore.setPassword(spaceyPw)
    const returnedPw = await passwordStore.getPassword()
    expect(returnedPw).toEqual(spaceyPw.trim())
  })
})
