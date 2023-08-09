import passwordStore from "@core/domains/app/store.password"

import { changePassword } from "./helpers"

export const migratePasswordV1ToV2 = async (plaintextPw: string) => {
  const {
    salt,
    password: hashedPw,
    check,
    secret,
  } = await passwordStore.createPassword(plaintextPw)
  const { ok, val } = await changePassword({ currentPw: plaintextPw, newPw: hashedPw })
  if (ok) {
    // success
    await passwordStore.set({ isHashed: true, salt, check, secret })
    passwordStore.setPassword(hashedPw)
    return true
  }
  throw new Error(val)
}

export const migratePasswordV2ToV1 = async (plaintextPw: string) => {
  const hashedPw = await passwordStore.getHashedPassword(plaintextPw)
  const { ok, val } = await changePassword({ currentPw: hashedPw, newPw: plaintextPw })
  if (ok) {
    // success
    await passwordStore.set({ salt: undefined, isTrimmed: false, isHashed: false })
    passwordStore.setPassword(plaintextPw)
    return true
  }
  throw new Error(val)
}
