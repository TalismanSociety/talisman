import keyring from "@polkadot/ui-keyring"
import { assert } from "@polkadot/util"
import { sleep } from "@talismn/util"
import { DEBUG, TALISMAN_WEB_APP_DOMAIN, TEST } from "extension-shared"
import { BehaviorSubject, Subject } from "rxjs"

import { genericSubscription } from "../../handlers/subscriptions"
import { talismanAnalytics } from "../../libs/Analytics"
import { ExtensionHandler } from "../../libs/Handler"
import { requestStore } from "../../libs/requests/store"
import { windowManager } from "../../libs/WindowManager"
import type { MessageTypes, RequestTypes, ResponseType } from "../../types"
import { Port } from "../../types/base"
import { authenticateLegacyMethod } from "../accounts/legacy"
import { changePassword } from "./helpers"
import { protector } from "./protector"
import { PasswordStoreData } from "./store.password"
import type {
  AnalyticsCaptureRequest,
  ChangePasswordStatusUpdate,
  ChangePasswordStatusUpdateType,
  LoggedinType,
  ModalOpenRequest,
  RequestLogin,
  RequestOnboardCreatePassword,
  RequestRoute,
  SendFundsOpenRequest,
} from "./types"
import { ChangePasswordStatusUpdateStatus } from "./types"

export default class AppHandler extends ExtensionHandler {
  #modalOpenRequest = new Subject<ModalOpenRequest>()

  private async createPassword({
    pass,
    passConfirm,
  }: RequestOnboardCreatePassword): Promise<boolean> {
    if (!(DEBUG || TEST)) await sleep(1000)
    assert(pass, "Password cannot be empty")
    assert(passConfirm, "Password confirm cannot be empty")

    assert(pass === passConfirm, "Passwords do not match")

    const accounts = keyring.getAccounts().length
    assert(!accounts, "Accounts already exist")

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

    this.stores.password.setPassword(transformedPw)
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
        this.stores.password.setPassword(transformedPassword)
        await this.stores.password.setupAuthSecret(transformedPassword)
        talismanAnalytics.capture("authenticate", { method: "legacy" })
      } else {
        await this.stores.password.authenticate(pass)
        talismanAnalytics.capture("authenticate", { method: "new" })
      }

      return true
    } catch (e) {
      this.stores.password.clearPassword()
      return false
    }
  }

  private authStatus(): LoggedinType {
    return this.stores.password.isLoggedIn.value
  }

  private lock(): LoggedinType {
    this.stores.password.clearPassword()
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
      const mnemonicsUnconfirmed = await this.stores.mnemonics.hasUnconfirmed()
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

      let hashedNewPw, newSalt
      if (isHashedAlready) hashedNewPw = await this.stores.password.getHashedPassword(newPw)
      else {
        // need to create a new password and salt
        const { salt, password } = await this.stores.password.createPassword(newPw)
        hashedNewPw = password
        newSalt = salt
      }

      const transformedPw = await this.stores.password.transformPassword(currentPw)
      const result = await changePassword(
        { currentPw: transformedPw, newPw: hashedNewPw },
        updateProgress
      )
      if (!result.ok) throw new Error(result.val)

      updateProgress(ChangePasswordStatusUpdateStatus.AUTH)

      // update password secret
      const secretResult = await this.stores.password.createAuthSecret(hashedNewPw)
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
      updateProgress(ChangePasswordStatusUpdateStatus.DONE)

      return result.val
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
    // delete all the accounts
    keyring.getAccounts().forEach((acc) => keyring.forgetAccount(acc.address))
    this.stores.app.set({ onboarded: "FALSE" })
    await this.stores.password.reset()
    await this.stores.mnemonics.clear()
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

  private async openModal(request: ModalOpenRequest): Promise<void> {
    const queryUrl = chrome.runtime.getURL("dashboard.html")
    const [tab] = await chrome.tabs.query({ url: queryUrl })
    if (!tab) {
      await windowManager.openDashboard({ route: "/portfolio" })
      // wait for newly created page to load and subscribe to backend (max 5 seconds)
      for (let i = 0; i < 50 && !this.#modalOpenRequest.observed; i++) await sleep(100)
    }
    this.#modalOpenRequest.next(request)
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

      case "pri(app.modalOpen.request)":
        return this.openModal(request as ModalOpenRequest)

      case "pri(app.sendFunds.open)":
        return this.openSendFunds(request as RequestTypes["pri(app.sendFunds.open)"])

      case "pri(app.modalOpen.subscribe)":
        return genericSubscription<"pri(app.modalOpen.subscribe)">(id, port, this.#modalOpenRequest)

      case "pri(app.analyticsCapture)": {
        const { eventName, options } = request as AnalyticsCaptureRequest
        talismanAnalytics.capture(eventName, options)
        return true
      }

      case "pri(app.phishing.addException)": {
        return protector.addException(
          (request as RequestTypes["pri(app.phishing.addException)"]).url
        )
      }

      case "pri(app.resetWallet)":
        return this.resetWallet()

      case "pri(app.requests)":
        return requestStore.subscribe(id, port)

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
