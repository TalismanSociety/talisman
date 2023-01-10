import { StorageProvider } from "@core/libs/Store"
import { assert } from "@polkadot/util"
import { genSalt, hash } from "bcryptjs"
import { BehaviorSubject } from "rxjs"
import { Err, Ok, Result } from "ts-results"

/* ----------------------------------------------------------------
Contains sensitive data.
Should not be used outside of the Extension handler.
------------------------------------------------------------------*/

type LOGGEDIN_TRUE = "TRUE"
type LOGGEDIN_FALSE = "FALSE"
type LOGGEDIN_UNKNOWN = "UNKNOWN"
const TRUE: LOGGEDIN_TRUE = "TRUE"
const FALSE: LOGGEDIN_FALSE = "FALSE"

export type LoggedInType = LOGGEDIN_TRUE | LOGGEDIN_FALSE | LOGGEDIN_UNKNOWN

export type PasswordStoreData = {
  salt?: string
  isTrimmed: boolean
  isHashed: boolean
  ignorePasswordUpdate: boolean
}

const initialData = {
  // passwords from early versions of Talisman were 'trimmed'.
  isTrimmed: true,
  isHashed: false,
  salt: undefined,
  ignorePasswordUpdate: false,
}

export class PasswordStore extends StorageProvider<PasswordStoreData> {
  #password?: string = undefined
  isLoggedIn = new BehaviorSubject<LoggedInType>(this.hasPassword ? TRUE : FALSE)
  #autoLockTimer?: NodeJS.Timeout

  public resetAutoLockTimer(seconds: number) {
    if (this.#autoLockTimer) clearTimeout(this.#autoLockTimer)
    if (seconds > 0) this.#autoLockTimer = setTimeout(() => this.clearPassword(), seconds * 1000)
  }

  async clear() {
    // wipes everything, use with caution
    this.set({ isTrimmed: false, isHashed: true, salt: undefined, ignorePasswordUpdate: false })
  }

  async createPassword(plaintextPw: string) {
    const salt = await generateSalt()
    const pwResult = await getHashedPassword(plaintextPw, salt)
    if (!pwResult.ok) pwResult.unwrap()
    return { password: pwResult.val, salt }
  }

  setPassword(password: string | undefined) {
    this.#password = password
    this.isLoggedIn.next(password !== undefined ? TRUE : FALSE)
  }

  public async getHashedPassword(plaintextPw: string) {
    const salt = await this.get("salt")
    assert(salt, "Password salt has not been generated yet")
    const pwResult = await getHashedPassword(plaintextPw, salt)
    if (!pwResult.ok) pwResult.unwrap()
    return pwResult.val
  }

  public async setPlaintextPassword(plaintextPw: string) {
    const pw = await this.transformPassword(plaintextPw)
    this.setPassword(pw)
  }

  public clearPassword() {
    this.setPassword(undefined)
  }

  async transformPassword(password: string) {
    let result = password
    const { isTrimmed, isHashed, salt } = await this.get()
    if (isTrimmed) result = result.trim()
    if (isHashed) {
      assert(salt, "Password salt has not been generated yet")
      const { ok, val: hashedPwVal } = await getHashedPassword(result, salt)
      if (!ok) throw new Error(hashedPwVal)
      result = hashedPwVal
    }
    return result
  }

  async checkPassword(password: string) {
    assert(this.isLoggedIn.value, "Unauthorised")
    const pw = await this.transformPassword(password)
    assert(pw === this.getPassword(), "Incorrect password")
    return pw
  }

  getPassword() {
    if (!this.#password) return undefined
    return this.#password
  }

  get hasPassword() {
    return !!this.#password
  }
}

export const generateSalt = () => genSalt(13)

export const getHashedPassword = async (
  password: string,
  salt: string
): Promise<Result<string, string>> => {
  try {
    const derivedHash = await hash(password, salt)
    return Ok(derivedHash)
  } catch (error) {
    return Err(error as string)
  }
}

const passwordStore = new PasswordStore("password", initialData)
export default passwordStore
