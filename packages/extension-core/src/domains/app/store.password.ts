import { decrypt, encrypt } from "@metamask/browser-passworder"
import { assert } from "@polkadot/util"
import { compare, genSalt, hash } from "bcryptjs"
import { BehaviorSubject } from "rxjs"
import { Err, Ok, Result } from "ts-results"

import { StorageProvider } from "../../libs/Store"
import { sessionStorage } from "../../util/sessionStorageCompat"

/* ----------------------------------------------------------------
Contains sensitive data.
Should not be used outside of the Extension handler.
------------------------------------------------------------------*/

type LOGGEDIN_TRUE = "TRUE"
type LOGGEDIN_FALSE = "FALSE"
type LOGGEDIN_UNKNOWN = "UNKNOWN"
const TRUE: LOGGEDIN_TRUE = "TRUE"
const FALSE: LOGGEDIN_FALSE = "FALSE"
const UNKNOWN: LOGGEDIN_UNKNOWN = "UNKNOWN"

export type LoggedInType = LOGGEDIN_TRUE | LOGGEDIN_FALSE | LOGGEDIN_UNKNOWN

export type PasswordStoreData = {
  salt?: string
  isTrimmed: boolean
  isHashed: boolean
  secret?: string
  check?: string
}

const initialData = {
  // passwords from early versions of Talisman were 'trimmed'.
  isTrimmed: true,
  isHashed: false,
  salt: undefined,
}

export class PasswordStore extends StorageProvider<PasswordStoreData> {
  isLoggedIn = new BehaviorSubject<LoggedInType>(UNKNOWN)
  #autoLockTimer?: NodeJS.Timeout

  constructor(prefix: string, data: Partial<PasswordStoreData> = initialData) {
    super(prefix, data)
    // on every instantiation of this store, check to see if logged in
    this.hasPassword().then((result) => {
      this.isLoggedIn.next(result ? TRUE : FALSE)
    })
  }

  public resetAutoLockTimer(seconds: number) {
    if (this.#autoLockTimer) clearTimeout(this.#autoLockTimer)
    if (seconds > 0) this.#autoLockTimer = setTimeout(() => this.clearPassword(), seconds * 1000)
  }

  async reset() {
    // use with caution
    return this.set({
      isTrimmed: false,
      isHashed: true,
      salt: undefined,
      secret: undefined,
      check: undefined,
    })
  }

  async createAuthSecret(password: string) {
    const secret = crypto.randomUUID()
    const check = await encrypt(password, { secret })
    const result = (await decrypt(password, check)) as { secret: string }
    assert(result.secret && result.secret === secret, "Unable to set password")
    return { secret, check }
  }

  async setupAuthSecret(password: string) {
    const result = await this.createAuthSecret(password)
    return await this.set(result)
  }

  /**
   * Creates a hashed version of the password, which is used to create an authentication secret, and used to encrypt all secret info
   *
   * This is used in cases where we may need to rollback, so it should never produce any side effects (like saving data to localstorage)
   * @param plaintextPw The plain text user password to be used to create a hashed password and an authentication secret
   * @returns
   */
  async createPassword(plaintextPw: string) {
    const salt = await generateSalt()
    const pwResult = await getHashedPassword(plaintextPw, salt)
    if (!pwResult.ok) pwResult.unwrap()
    // create stored secret and check value
    const { secret, check } = await this.createAuthSecret(pwResult.val)

    return { password: pwResult.val, salt, secret, check }
  }

  async authenticate(password: string) {
    if (this.isLoggedIn.value === TRUE) return
    const pw = await this.transformPassword(password)
    const { secret, check } = await this.get()
    assert(secret && check, "Unable to authenticate")
    const result = (await decrypt(pw, check)) as { secret: string }
    assert(result.secret && result.secret === secret, "Incorrect Password")
    this.setPassword(pw)
  }

  setPassword(password: string | undefined) {
    sessionStorage.set({ password })
    this.isLoggedIn.next(password !== undefined ? TRUE : FALSE)
  }

  public async getHashedPassword(plaintextPw: string) {
    const salt = await this.get("salt")
    assert(salt, "Password salt has not been generated yet")
    const { err, val } = await getHashedPassword(plaintextPw, salt)
    if (err) throw new Error(val)
    return val
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
    assert(this.isLoggedIn.value === TRUE, "Unauthorised")

    const hash = await this.getPassword()
    assert(hash, "Unauthorised")

    const { isTrimmed, isHashed } = await this.get()
    const plainText = isTrimmed ? password.trim() : password

    const isMatch = isHashed ? await compare(plainText, hash) : plainText === hash
    assert(isMatch, "Incorrect password")
  }

  /**
   * Returns the encrypted password if it is set, otherwise undefined
   */
  async getPassword() {
    const pw = await sessionStorage.get("password")
    if (!pw) return undefined
    return pw
  }

  async hasPassword() {
    return !!(await sessionStorage.get("password"))
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

export const passwordStore = new PasswordStore("password", initialData)
