import { StorageProvider } from "@core/libs/Store"
import { BehaviorSubject } from "rxjs"

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
  isTrimmed: boolean
}

const initialData: PasswordStoreData = {
  // passwords from early versions of Talisman were 'trimmed'.
  isTrimmed: true,
}

export class PasswordStore extends StorageProvider<PasswordStoreData> {
  #rawPassword?: string = undefined
  isLoggedIn = new BehaviorSubject<LoggedInType>(this.hasPassword ? TRUE : FALSE)
  #autoLockTimer?: NodeJS.Timeout

  public resetAutoLockTimer(seconds: number) {
    if (this.#autoLockTimer) clearTimeout(this.#autoLockTimer)
    if (seconds > 0) this.#autoLockTimer = setTimeout(() => this.clearPassword(), seconds * 1000)
  }

  setPassword(password: string | undefined) {
    this.#rawPassword = password
    this.isLoggedIn.next(password !== undefined ? TRUE : FALSE)
  }

  clearPassword() {
    this.setPassword(undefined)
  }

  async transformPassword(password: string) {
    if (await this.get("isTrimmed")) return password.trim()
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

const passwordStore = new PasswordStore("password", initialData)

export default passwordStore
