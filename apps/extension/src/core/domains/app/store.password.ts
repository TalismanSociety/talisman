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

type PasswordStoreData = {
  salt?: string
  isTrimmed: boolean
  isHashed: boolean
}

const initialData = {
  // passwords from early versions of Talisman were 'trimmed'.
  isTrimmed: true,
  isHashed: false,
  salt: undefined,
}

export class PasswordStore extends StorageProvider<PasswordStoreData> {
  #rawPassword?: string = undefined
  isLoggedIn = new BehaviorSubject<LoggedInType>(this.hasPassword ? TRUE : FALSE)
  #autoLockTimer?: NodeJS.Timeout

  public resetAutoLockTimer(seconds: number) {
    if (this.#autoLockTimer) clearTimeout(this.#autoLockTimer)
    if (seconds > 0) this.#autoLockTimer = setTimeout(() => this.clearPassword(), seconds * 1000)
  }

  async createPassword(plaintextPw: string) {
    const salt = await generateSalt()
    const pwResult = await getHashedPassword(plaintextPw, salt)
    if (!pwResult.ok) pwResult.unwrap()
    else {
      this.setHashedPassword(pwResult.val)
      await this.set({ salt })
    }
  }

  setHashedPassword(password: string | undefined) {
    this.#rawPassword = password
    this.isLoggedIn.next(password !== undefined ? TRUE : FALSE)
  }

  public async getHashedPassword(plaintextPw: string) {
    const salt = await this.get("salt")
    assert(salt, "Password salt has not been generated yet")
    const pwResult = await getHashedPassword(plaintextPw, salt)
    if (!pwResult.ok) pwResult.unwrap()
    return pwResult.val as string
  }

  public async setPlaintextPassword(plaintextPw: string) {
    const salt = await this.get("salt")
    assert(salt, "Password salt has not been generated yet")
    const pwResult = await getHashedPassword(plaintextPw, salt)
    if (!pwResult.ok) pwResult.unwrap()
    else this.setHashedPassword(pwResult.val)
  }

  public clearPassword() {
    this.setHashedPassword(undefined)
  }

  async transformPassword(password: string) {
    const shouldTrim = await this.get("isTrimmed")
    if (shouldTrim) return password.trim()
    return password
  }

  async getPassword() {
    if (!this.#rawPassword) return undefined
    return await this.transformPassword(this.#rawPassword)
  }

  get hasPassword() {
    return !!this.#rawPassword
  }
}

export const generateSalt = () => genSalt(13)

export const getHashedPassword = async (
  password: string,
  salt: string
): Promise<Result<string, unknown>> => {
  try {
    const derivedHash = await hash(password, salt)
    return Ok(derivedHash)
  } catch (error) {
    return Err(error)
  }
}

const passwordStore = new PasswordStore("password", initialData)
export default passwordStore
