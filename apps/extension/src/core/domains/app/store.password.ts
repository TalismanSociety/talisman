import { StorageProvider } from "@core/libs/Store"
import { decrypt, encrypt } from "@metamask/browser-passworder"
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
  secret?: string
  check?: string
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

  async reset() {
    // use with caution
    return this.set({
      isTrimmed: false,
      isHashed: true,
      salt: undefined,
      secret: undefined,
      check: undefined,
      ignorePasswordUpdate: false,
    })
  }

  async setUpAuthSecret(password: string) {
    const secret = crypto.randomUUID()
    const check = await encrypt(password, { secret })
    const result = (await decrypt(password, check)) as { secret: string }
    assert(result.secret && result.secret === secret, "Unable to set password")

    await this.set({ secret, check })
  }

  async createPassword(plaintextPw: string) {
    const salt = await generateSalt()
    const pwResult = await getHashedPassword(plaintextPw, salt)
    if (!pwResult.ok) pwResult.unwrap()
    // create stored secret and check value
    if (!(await this.get("secret"))) await this.setUpAuthSecret(pwResult.val)

    return { password: pwResult.val, salt }
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
