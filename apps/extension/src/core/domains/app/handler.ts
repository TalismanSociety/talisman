import { AccountMeta } from "@core/domains/accounts/types"
import { AppStoreData } from "@core/domains/app/store.app"
import type {
  AnalyticsCaptureRequest,
  LoggedinType,
  ModalOpenParams,
  ModalTypes,
  OnboardedType,
  RequestLogin,
  RequestOnboard,
  RequestRoute,
} from "@core/domains/app/types"
import { getEthDerivationPath } from "@core/domains/ethereum/helpers"
import { genericSubscription } from "@core/handlers/subscriptions"
import { talismanAnalytics } from "@core/libs/Analytics"
import { ExtensionHandler } from "@core/libs/Handler"
import type { MessageTypes, RequestTypes, ResponseType } from "@core/types"
import { Port } from "@core/types/base"
import { sleep } from "@core/util/sleep"
import keyring from "@polkadot/ui-keyring"
import { assert } from "@polkadot/util"
import { mnemonicGenerate, mnemonicValidate } from "@polkadot/util-crypto"
import { Subject } from "rxjs"
import Browser from "webextension-polyfill"

import { AccountTypes } from "../accounts/helpers"
import { changePassword } from "./helpers"

export default class AppHandler extends ExtensionHandler {
  #modalOpenRequest = new Subject<ModalTypes>()

  private async onboard({ pass, passConfirm, mnemonic }: RequestOnboard): Promise<OnboardedType> {
    await sleep(1000)
    assert(pass, "Password cannot be empty")
    assert(passConfirm, "Password confirm cannot be empty")

    assert(pass === passConfirm, "Passwords do not match")

    assert(!(await this.stores.app.getIsOnboarded()), "A root account already exists")

    const account = this.getRootAccount()
    assert(!account, "A root account already exists")

    let confirmed = false
    const method = mnemonic ? "import" : "new"
    // no mnemonic passed in generate a mnemonic as needed
    if (!mnemonic) {
      mnemonic = mnemonicGenerate()
    } else {
      // mnemonic is passed in from user
      const isValidMnemonic = mnemonicValidate(mnemonic)
      assert(isValidMnemonic, "Supplied mnemonic is not valid")
      confirmed = true
    }

    this.stores.password.setPassword(pass)
    const transformedPw = await this.stores.password.getPassword()
    assert(transformedPw, "Password error")

    const { pair } = keyring.addUri(mnemonic, transformedPw, {
      name: "My Polkadot Account",
      origin: AccountTypes.ROOT,
    } as AccountMeta)
    await this.stores.seedPhrase.add(mnemonic, pair.address, transformedPw, confirmed)

    try {
      // also derive a first ethereum account
      const derivationPath = getEthDerivationPath()
      keyring.addUri(
        `${mnemonic}${derivationPath}`,
        transformedPw,
        {
          name: `My Ethereum Account`,
          origin: AccountTypes.DERIVED,
          parent: pair.address,
          derivationPath,
        },
        "ethereum"
      )
    } catch (err) {
      // do not break onboarding as user couldn't recover from it
      // eslint-disable-next-line no-console
      console.error(err)
    }

    const result = await this.stores.app.setOnboarded(method === "new")
    talismanAnalytics.capture("onboarded", { method })
    return result
  }

  private async authenticate({ pass }: RequestLogin): Promise<boolean> {
    await new Promise((resolve) =>
      setTimeout(resolve, process.env.NODE_ENV === "production" ? 1000 : 0)
    )

    try {
      // get root account
      const rootAccount = this.getRootAccount()

      assert(rootAccount, "No root account")

      // fetch keyring pair from address
      const pair = keyring.getPair(rootAccount.address)

      // attempt unlock the pair
      // a successful unlock means authenticated
      const password = await this.stores.password.transformPassword(pass)
      pair.unlock(password)
      this.stores.password.setPassword(pass)
      talismanAnalytics.capture("authenticate")
      return true
    } catch (e) {
      this.stores.password.clearPassword()
      return false
    }
  }

  private getRootAccount() {
    return keyring.getAccounts().find(({ meta }) => meta?.origin === AccountTypes.ROOT)
  }

  private authStatus(): LoggedinType {
    return this.stores.password.isLoggedIn.value
  }

  private lock(): LoggedinType {
    this.stores.password.clearPassword()
    return this.authStatus()
  }

  private async changePassword({
    currentPw,
    newPw,
    newPwConfirm,
  }: RequestTypes["pri(app.changePassword)"]) {
    const rootAccount = this.getRootAccount()
    assert(rootAccount, "No root account")

    // only allow users who have confirmed backing up their seed phrase to change PW
    const mnemonicConfirmed = await this.stores.seedPhrase.get("confirmed")
    assert(
      mnemonicConfirmed,
      "Please backup your seed phrase before attempting to change your password."
    )

    // fetch keyring pair from address
    const pair = keyring.getPair(rootAccount.address)

    const transformedPw = await this.stores.password.transformPassword(currentPw)
    assert(transformedPw, "Password error")
    assert(transformedPw === (await this.stores.password.getPassword()), "Incorrect Password")
    // attempt to unlock the pair
    // a successful unlock means password is ok
    try {
      pair.unlock(transformedPw)
    } catch (err) {
      throw new Error("Incorrect password")
    }
    // test if the two inputs of the new password are the same
    assert(newPw === newPwConfirm, "New password and new password confirmation must match")

    const result = await changePassword({ currentPw: transformedPw, newPw })
    if (!result.ok) throw Error(result.val)
    await this.stores.password.setPassword(newPw)
    await this.stores.password.set({ isTrimmed: false })
    return result.val
  }

  private async dashboardOpen({ route }: RequestRoute): Promise<boolean> {
    if (!(await this.stores.app.getIsOnboarded())) return this.onboardOpen()
    this.state.openDashboard({ route })
    return true
  }

  private async openModal({ modalType }: ModalOpenParams): Promise<void> {
    const queryUrl = Browser.runtime.getURL("dashboard.html")
    const [tab] = await Browser.tabs.query({ url: queryUrl })
    if (!tab) await this.state.openDashboard({ route: "/portfolio" })
    this.#modalOpenRequest.next(modalType)
  }

  private onboardOpen(): boolean {
    this.state.openOnboarding()
    return true
  }

  private popupOpen(): boolean {
    // TODO does absolutely nothing ???
    return true
  }

  private promptLogin(closeOnSuccess: boolean): boolean {
    this.state.promptLogin(closeOnSuccess)
    return true
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
      case "pri(app.onboard)":
        return this.onboard(request as RequestOnboard)

      case "pri(app.onboardStatus)":
        return await this.stores.app.get("onboarded")

      case "pri(app.onboardStatus.subscribe)":
        return genericSubscription<"pri(app.onboardStatus.subscribe)">(
          id,
          port,
          this.stores.app.observable,
          ({ onboarded }: AppStoreData) => onboarded
        )

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
        return await this.changePassword(request as RequestTypes["pri(app.changePassword)"])

      case "pri(app.dashboardOpen)":
        return await this.dashboardOpen(request as RequestRoute)

      case "pri(app.onboardOpen)":
        return this.onboardOpen()

      case "pri(app.popupOpen)":
        return this.popupOpen()

      case "pri(app.promptLogin)":
        return this.promptLogin(request as boolean)

      case "pri(app.modalOpen.request)":
        return this.openModal(request as ModalOpenParams)

      case "pri(app.modalOpen.subscribe)":
        return genericSubscription<"pri(app.modalOpen.subscribe)">(
          id,
          port,
          this.#modalOpenRequest,
          (modalType) => ({ modalType })
        )

      case "pri(app.analyticsCapture)": {
        const { eventName, options } = request as AnalyticsCaptureRequest
        talismanAnalytics.capture(eventName, options)
        return true
      }

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
