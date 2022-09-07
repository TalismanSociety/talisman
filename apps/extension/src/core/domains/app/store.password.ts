import { randomUUID, scrypt } from "crypto"

import { StorageProvider } from "@core/libs/Store"
import keyring from "@polkadot/ui-keyring"
import { assert } from "@polkadot/util"
import { genSalt, hash } from "bcryptjs"
import { BehaviorSubject } from "rxjs"
import { Err, Ok, Result } from "ts-results"
import Browser from "webextension-polyfill"

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
  passwordVersion: number // 1: unhashed, trimmed; 2: hashed, trimmed; 3: hashed, untrimmed
}

const initialData = {
  passwordVersion: 1,
}

export class PasswordStore extends StorageProvider<PasswordStoreData> {
  #password?: string = undefined
  isLoggedIn = new BehaviorSubject<LoggedInType>(this.hasPassword ? TRUE : FALSE)

  constructor() {
    super("password", initialData)
    // migration to remove password field from local storage for anyone who may have it there.
    Browser.storage.local.remove("password")
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

  public setHashedPassword(password: string | undefined) {
    this.#password = password
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

  getPassword() {
    // This is intentionally indirect to reduce possible misuse of password
    return this.#password
  }

  get hasPassword() {
    return !!this.getPassword()
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

const passwordStore = new PasswordStore()

export default passwordStore
