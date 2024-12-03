import { generateSalt, getHashedPassword, PasswordStore } from "../../../domains/app/store.password"

const spaceyPw = "  passWord  "
const pwStoreInitial = { isTrimmed: true, isHashed: false }

describe("Test password store password not hashed", () => {
  afterEach(async () => {
    await chrome.storage.local.clear()
  })

  test("setting isTrimmed false ensures passwords with spaces are not trimmed", async () => {
    const passwordStore = new PasswordStore("password", pwStoreInitial)
    await passwordStore.set({ isTrimmed: false })
    await passwordStore.setPlaintextPassword(spaceyPw)
    const returnedPw = await passwordStore.getPassword()
    expect(returnedPw).toEqual(spaceyPw)
  })

  test("setting isTrimmed true ensures passwords with spaces are trimmed", async () => {
    const passwordStore = new PasswordStore("password", pwStoreInitial)
    expect(await passwordStore.get("isTrimmed")).toBe(true)
    await passwordStore.setPlaintextPassword(spaceyPw)
    const returnedPw = await passwordStore.getPassword()
    expect(returnedPw).toEqual(spaceyPw.trim())
  })

  test("setting isHashed true ensures passwords are hashed", async () => {
    const salt = await generateSalt()
    const passwordStore = new PasswordStore("password", { isHashed: true, salt })

    const { ok, val: expectedHashedPw } = await getHashedPassword(spaceyPw, salt)
    expect(ok)
    expect(await passwordStore.get("isHashed")).toBe(true)
    await passwordStore.setPlaintextPassword(spaceyPw)
    const returnedPw = await passwordStore.getPassword()
    expect(returnedPw).toEqual(expectedHashedPw)
  })

  test("setting isHashed false ensures passwords are not hashed", async () => {
    const passwordStore = new PasswordStore("password", { isHashed: false, isTrimmed: false })
    expect(await passwordStore.get("isHashed")).toBe(false)
    await passwordStore.setPlaintextPassword(spaceyPw)
    const returnedPw = await passwordStore.getPassword()
    expect(returnedPw).toEqual(spaceyPw)
  })

  test("logging out deletes the stored password", async () => {
    // set up the logged-in password store
    const passwordStore = new PasswordStore("password", { isHashed: false, isTrimmed: false })
    expect(await passwordStore.get("isHashed")).toBe(false)
    await passwordStore.setPlaintextPassword(spaceyPw)
    const returnedPw = await passwordStore.getPassword()
    expect(returnedPw).toEqual(spaceyPw)

    // log out (see the `lock` method of `packages/extension-core/src/domains/app/handler.ts` to confirm this is the same as there)
    passwordStore.clearPassword()

    // check that the password was cleared from storage by initialising a new PasswordStore and checking that it is not authenticated
    // (PasswordStore loads any stored password from storage as part of its constructor)
    const newPasswordStore = new PasswordStore("password", { isHashed: false, isTrimmed: false })
    expect(await newPasswordStore.getPassword()).toEqual(undefined)
  })
})
