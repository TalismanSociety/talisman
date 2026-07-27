import { DEBUG, TALISMAN_WEB_APP_DOMAIN, TEST } from "@common/constants"
import { log } from "@common/log"
import { assert, sleep } from "@talismn/util"
import { BehaviorSubject, map } from "rxjs"
import { genericSubscription } from "../../handlers/subscriptions"
import { talismanAnalytics } from "../../libs/Analytics"
import { ExtensionHandler } from "../../libs/Handler"
import { requestStore } from "../../libs/requests/store"
import { windowManager } from "../../libs/WindowManager"
import type { MessageTypes, RequestTypes, ResponseType } from "../../types"
import type { Port } from "../../types/base"
import { authenticateLegacyMethod } from "../accounts/legacy"
import { keyringStore } from "../keyring/store"
import { addException } from "./protector"
import { decryptPassword, encryptPassword, isUsablePrfOutput } from "./quickUnlockCrypto"
import type { PasswordStoreData } from "./store.password"
import { isCompleteEnrollment } from "./store.quickUnlock"
import type {
  AnalyticsCaptureRequest,
  ChangePasswordStatusUpdate,
  ChangePasswordStatusUpdateType,
  LoggedinType,
  QuickUnlockAuthenticateRequest,
  QuickUnlockAuthenticateResult,
  QuickUnlockCredentialInfo,
  QuickUnlockEnrollRequest,
  RequestLogin,
  RequestOnboardCreatePassword,
  RequestRoute,
  SendFundsOpenRequest,
} from "./types"
import { ChangePasswordStatusUpdateStatus } from "./types"

export default class AppHandler extends ExtensionHandler {
  private async createPassword({
    pass,
    passConfirm,
  }: RequestOnboardCreatePassword): Promise<boolean> {
    if (!(DEBUG || TEST)) await sleep(1000)
    assert(pass, "Password cannot be empty")
    assert(passConfirm, "Password confirm cannot be empty")

    assert(pass === passConfirm, "Passwords do not match")

    const accounts = await keyringStore.getAccounts()
    assert(!accounts.length, "Accounts already exist")

    // Before any accounts are created, we want to add talisman.xyz as an authorised site with connectAllSubstrate
    this.stores.sites.set({
      [TALISMAN_WEB_APP_DOMAIN]: {
        addresses: [],
        connectAllSubstrate: true,
        id: TALISMAN_WEB_APP_DOMAIN,
        origin: "Talisman",
        url: `https://${TALISMAN_WEB_APP_DOMAIN}`,
      },
    })

    const {
      password: transformedPw,
      salt,
      secret,
      check,
    } = await this.stores.password.createPassword(pass)
    assert(transformedPw, "Password creation failed")

    await this.stores.password.setPassword(transformedPw)
    await this.stores.password.set({ isTrimmed: false, isHashed: true, salt, secret, check })
    talismanAnalytics.capture("password created")

    return true
  }

  private async authenticate({ pass }: RequestLogin): Promise<boolean> {
    if (!(DEBUG || TEST)) await sleep(1000)

    try {
      const { secret, check } = await this.stores.password.get()
      if (!secret || !check) {
        const transformedPassword = await this.stores.password.transformPassword(pass)

        // attempt to log in via the legacy method
        authenticateLegacyMethod(transformedPassword)

        // we can now set up the auth secret
        await this.stores.password.setPassword(transformedPassword)
        await this.stores.password.setupAuthSecret(transformedPassword)
        talismanAnalytics.capture("authenticate", { method: "legacy" })
      } else {
        await this.stores.password.authenticate(pass)
        talismanAnalytics.capture("authenticate", { method: "new" })
      }
      // start the autolock timer
      this.stores.settings
        .get()
        .then(({ autoLockMinutes }) => this.stores.password.resetAutolockTimer(autoLockMinutes))

      return true
    } catch {
      await this.stores.password.clearPassword()
      return false
    }
  }

  private authStatus(): LoggedinType {
    return this.stores.password.isLoggedIn.value
  }

  private async lock(): Promise<LoggedinType> {
    await this.stores.password.clearPassword()
    return this.authStatus()
  }

  private async changePassword(
    id: string,
    port: Port,
    { currentPw, newPw, newPwConfirm }: RequestTypes["pri(app.changePassword)"]
  ) {
    const progressObservable = new BehaviorSubject<ChangePasswordStatusUpdate>({
      status: ChangePasswordStatusUpdateStatus.VALIDATING,
    })

    const updateProgress = (val: ChangePasswordStatusUpdateType, message?: string) =>
      progressObservable.next({ status: val, message })

    genericSubscription<"pri(app.changePassword.subscribe)">(id, port, progressObservable)
    try {
      // only allow users who have confirmed backing up their recovery phrase to change PW
      const mnemonics = await keyringStore.getMnemonics()
      const mnemonicsUnconfirmed = mnemonics.some((m) => !m.confirmed)
      assert(
        !mnemonicsUnconfirmed,
        "Please backup all recovery phrases before attempting to change your password."
      )

      // check given PW
      await this.stores.password.checkPassword(currentPw)

      // test if the two inputs of the new password are the same
      assert(newPw === newPwConfirm, "New password and new password confirmation must match")

      updateProgress(ChangePasswordStatusUpdateStatus.PREPARING)
      const isHashedAlready = await this.stores.password.get("isHashed")

      // biome-ignore lint/suspicious/noImplicitAnyLet: legacy
      let hashedNewPw, newSalt
      if (isHashedAlready) hashedNewPw = await this.stores.password.getHashedPassword(newPw)
      else {
        // need to create a new password and salt
        const { salt, password } = await this.stores.password.createPassword(newPw)
        hashedNewPw = password
        newSalt = salt
      }

      // compute new keyring password
      const transformedPw = await this.stores.password.transformPassword(currentPw)

      // precompute password check data so we dont attempt to change keyring password if this fails
      const secretResult = await this.stores.password.createAuthSecret(hashedNewPw)

      // the change is atomic: if this breaks then local storage wont be updated, we dont need to bother with a backup/restore mechanism
      updateProgress(ChangePasswordStatusUpdateStatus.KEYPAIRS)
      await keyringStore.changePassword(transformedPw, hashedNewPw)

      // update password storage
      updateProgress(ChangePasswordStatusUpdateStatus.AUTH)
      const pwStoreData: Partial<PasswordStoreData> = {
        ...secretResult,
        isTrimmed: false,
        isHashed: true,
      }
      if (newSalt) {
        pwStoreData.salt = newSalt
      }
      await this.stores.password.set(pwStoreData)
      await this.stores.password.setPlaintextPassword(newPw)

      // invalidate quick unlock enrollment since password changed
      await this.stores.quickUnlock.unenroll()

      updateProgress(ChangePasswordStatusUpdateStatus.DONE)

      return true
    } catch (error) {
      updateProgress(ChangePasswordStatusUpdateStatus.ERROR, (error as Error).message)
      return false
    }
  }

  private async checkPassword({ password }: RequestTypes["pri(app.checkPassword)"]) {
    await this.stores.password.checkPassword(password)
    return true
  }

  private async resetWallet() {
    this.stores.app.set({ onboarded: "FALSE" })

    await this.stores.password.reset()
    await this.stores.quickUnlock.unenroll()

    await keyringStore.reset()

    await windowManager.openOnboarding("/import?resetWallet=true")
    // since all accounts are being wiped, all sites need to be reset - so they may as well be wiped.
    await this.stores.sites.clear()
    // since all accounts are being wiped, account catalog also needs to be wiped.
    await this.stores.accountsCatalog.clear()

    return true
  }

  private async dashboardOpen({ route }: RequestRoute): Promise<boolean> {
    if (!(await this.stores.app.getIsOnboarded())) return this.onboardOpen()
    windowManager.openDashboard({ route })
    return true
  }

  private async openSendFunds({
    from,
    tokenId,
    tokenSymbol,
    to,
  }: SendFundsOpenRequest): Promise<boolean> {
    const params = new URLSearchParams()
    if (from) params.append("from", from)
    if (tokenId) params.append("tokenId", tokenId)
    // tokenId takes precedence over tokenSymbol
    if (!tokenId && tokenSymbol) params.append("tokenSymbol", tokenSymbol)
    if (to) params.append("to", to)
    await windowManager.popupOpen(`#/send?${params.toString()}`)

    return true
  }

  private onboardOpen(): boolean {
    windowManager.openOnboarding()
    return true
  }

  private popupOpen(argument?: string): boolean {
    windowManager.popupOpen(argument)
    return true
  }

  private promptLogin(): Promise<boolean> {
    return windowManager.promptLogin()
  }

  // --- quick unlock ---

  private async quickUnlockEnroll(request: QuickUnlockEnrollRequest): Promise<boolean> {
    assert(
      this.stores.password.isLoggedIn.value === "TRUE",
      "Must be logged in to enable quick unlock"
    )

    // quick unlock authenticates against the auth secret, which accounts that last logged in
    // through the legacy method may not have yet - enrolling them would never be able to unlock
    const { secret, check } = await this.stores.password.get()
    assert(secret && check, "Please log in again before enabling quick unlock")

    const password = await this.stores.password.getPassword()
    assert(password, "No password in session")

    // the transformed password is encrypted here and never leaves the background
    const { encryptedPassword, iv } = await encryptPassword(password, request.prfOutput)

    await this.stores.quickUnlock.enroll({
      credentialId: request.credentialId,
      prfSalt: request.prfSalt,
      encryptedPassword,
      iv,
    })
    talismanAnalytics.capture("quick unlock enrolled")
    return true
  }

  private async quickUnlockUnenroll(): Promise<boolean> {
    assert(
      this.stores.password.isLoggedIn.value === "TRUE",
      "Must be logged in to disable quick unlock"
    )

    await this.stores.quickUnlock.unenroll()
    talismanAnalytics.capture("quick unlock unenrolled")
    return true
  }

  /** Only the public part of the enrollment - the ciphertext never leaves the background */
  private async quickUnlockGetCredentialInfo(): Promise<QuickUnlockCredentialInfo | null> {
    const enrollment = await this.stores.quickUnlock.get()
    if (!isCompleteEnrollment(enrollment)) return null

    const { credentialId, prfSalt } = enrollment
    return { credentialId, prfSalt }
  }

  private async quickUnlockAuthenticate({
    prfOutput,
  }: QuickUnlockAuthenticateRequest): Promise<QuickUnlockAuthenticateResult> {
    // nothing to unlock, and a mismatching prf output here must not log the user out
    if (this.stores.password.isLoggedIn.value === "TRUE") return "success"

    // no throttle here, unlike the password paths: a mismatching prf output unenrolls on the first
    // attempt, so there is no second guess to slow down

    // a prf output that doesn't even decode never came off an authenticator, so it says nothing
    // about the enrollment - fail the attempt instead of destroying it
    if (!isUsablePrfOutput(prfOutput)) return "failed"

    // read outside of the try blocks, a storage failure here must not clear a valid enrollment
    const enrollment = await this.stores.quickUnlock.get()
    // nothing usable is stored, whatever credential the caller holds is orphaned
    if (!isCompleteEnrollment(enrollment)) return "unenrolled"

    // a password login can still set the auth secret up, this enrollment isn't dead yet
    const { secret, check } = await this.stores.password.get()
    if (!secret || !check) return "failed"

    let password: string
    try {
      password = await decryptPassword(enrollment.encryptedPassword, enrollment.iv, prfOutput)
    } catch (cause) {
      // the prf output decodes, so decryption is now a pure computation over stored data and a
      // failure means the output doesn't match the enrollment and never will - drop it instead of
      // prompting for it on every login
      log.error("Quick unlock decryption failed, clearing enrollment", { cause })
      await this.stores.quickUnlock.unenroll()
      return "unenrolled"
    }

    try {
      // check before starting the session, so that only a proven mismatch reaches the unenroll below
      await this.stores.password.checkHashedPassword(password)
    } catch (cause) {
      await this.stores.password.clearPassword()

      // the auth secret was read above, so the recovered password simply doesn't match it anymore
      // and this enrollment can never unlock the wallet again
      log.error("Quick unlock authentication failed, clearing enrollment", { cause })
      await this.stores.quickUnlock.unenroll()

      return "unenrolled"
    }

    try {
      await this.stores.password.setPassword(password)
    } catch (cause) {
      // the password is proven good, so this is the session write failing - the enrollment is still
      // valid and the next attempt can succeed, keep it
      await this.stores.password.clearPassword()
      log.error("Quick unlock could not start the session", { cause })
      return "failed"
    }

    talismanAnalytics.capture("authenticate", { method: "quickUnlock" })

    this.stores.settings
      .get()
      .then(({ autoLockMinutes }) => this.stores.password.resetAutolockTimer(autoLockMinutes))

    return "success"
  }

  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
    port: Port
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      // --------------------------------------------------------------------
      // app handlers -------------------------------------------------------
      // --------------------------------------------------------------------
      case "pri(app.onboardCreatePassword)":
        return this.createPassword(request as RequestOnboardCreatePassword)

      case "pri(app.authenticate)":
        return this.authenticate(request as RequestLogin)

      case "pri(app.authStatus)":
        return this.authStatus()

      case "pri(app.authStatus.subscribe)":
        return genericSubscription<"pri(app.authStatus.subscribe)">(
          id,
          port,
          this.stores.password.isLoggedIn
        )

      case "pri(app.lock)":
        return this.lock()

      case "pri(app.changePassword)":
      case "pri(app.changePassword.subscribe)":
        return await this.changePassword(
          id,
          port,
          request as RequestTypes["pri(app.changePassword)"]
        )

      case "pri(app.checkPassword)":
        return await this.checkPassword(request as RequestTypes["pri(app.checkPassword)"])

      case "pri(app.dashboardOpen)":
        return await this.dashboardOpen(request as RequestRoute)

      case "pri(app.onboardOpen)":
        return this.onboardOpen()

      case "pri(app.popupOpen)":
        return this.popupOpen(request as string | undefined)

      case "pri(app.promptLogin)":
        return this.promptLogin()

      case "pri(app.sendFunds.open)":
        return this.openSendFunds(request as RequestTypes["pri(app.sendFunds.open)"])

      case "pri(app.analyticsCapture)": {
        const { eventName, options } = request as AnalyticsCaptureRequest
        talismanAnalytics.capture(eventName, options)
        return true
      }

      case "pri(app.phishing.addException)": {
        return addException((request as RequestTypes["pri(app.phishing.addException)"]).url)
      }

      case "pri(app.resetWallet)":
        return this.resetWallet()

      case "pri(app.requests)":
        return requestStore.subscribe(id, port)

      // --------------------------------------------------------------------
      // quick unlock handlers -------------------------------------------------
      // --------------------------------------------------------------------
      case "pri(app.quickUnlock.enroll)":
        return this.quickUnlockEnroll(request as QuickUnlockEnrollRequest)

      case "pri(app.quickUnlock.unenroll)":
        return this.quickUnlockUnenroll()

      case "pri(app.quickUnlock.isEnrolled.subscribe)":
        return genericSubscription<"pri(app.quickUnlock.isEnrolled.subscribe)">(
          id,
          port,
          this.stores.quickUnlock.observable.pipe(
            map((data) => ({ enrolled: isCompleteEnrollment(data) }))
          )
        )

      case "pri(app.quickUnlock.getCredentialInfo)":
        return this.quickUnlockGetCredentialInfo()

      case "pri(app.quickUnlock.authenticate)":
        return this.quickUnlockAuthenticate(request as QuickUnlockAuthenticateRequest)

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
