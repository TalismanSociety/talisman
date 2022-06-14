import { BehaviorSubject } from "rxjs"
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
export class PasswordStore {
  #password?: string = undefined
  isLoggedIn = new BehaviorSubject<LoggedInType>(this.hasPassword ? TRUE : FALSE)

  constructor() {
    // migration to remove password field from local storage for anyone who may have it there.
    Browser.storage.local.remove("password")
  }

  setPassword(password: string | undefined) {
    this.#password = password
    this.isLoggedIn.next(password !== undefined ? TRUE : FALSE)
  }

  clearPassword() {
    this.setPassword(undefined)
  }

  getPassword() {
    // This is intentionally indirect to reduce possible misuse of password
    return this.#password
  }

  get hasPassword() {
    return !!this.getPassword()
  }
}

const passwordStore = new PasswordStore()

export default passwordStore
