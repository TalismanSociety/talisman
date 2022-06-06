import type {
  MessageTypes,
  RequestLogin,
  RequestOnboard,
  RequestRoute,
  RequestTypes,
  ResponseType,
  AccountMeta,
  Port,
  LoggedinType,
  OnboardedType,
  ModalTypes,
  ModalOpenParams,
} from "@core/types"
import Browser from "webextension-polyfill"
import keyring from "@polkadot/ui-keyring"
import { assert } from "@polkadot/util"
import { mnemonicGenerate, mnemonicValidate } from "@polkadot/util-crypto"
import { ExtensionHandler } from "@core/libs/Handler"
import { genericSubscription } from "@core/handlers/subscriptions"
import { AppStoreData } from "@core/domains/app/store.app"
import { Subject } from "rxjs"

export default class AppHandler extends ExtensionHandler {
  #modalOpenRequest = new Subject<ModalTypes>()

  private async onboard({
    name,
    pass,
    passConfirm,
    mnemonic,
  }: RequestOnboard): Promise<OnboardedType> {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    assert(name, "Name cannot be empty")
    assert(pass, "Password cannot be empty")
    assert(passConfirm, "Password confirm cannot be empty")

    assert(pass === passConfirm, "Passwords do not match")

    assert(!(await this.stores.app.getIsOnboarded()), "A root account already exists")

    const account = this.getRootAccount()
    assert(!account, "A root account already exists")

    let confirmed: boolean = false
    // no mnemonic passed in generate a mnemonic as needed
    if (!mnemonic) {
      mnemonic = mnemonicGenerate()
    }
    // mnemonic is passed in from user
    else {
      const isValidMnemonic = mnemonicValidate(mnemonic)
      assert(isValidMnemonic, "Supplied mnemonic is not valid")
      confirmed = true
    }

    const { pair } = keyring.addUri(mnemonic, pass, {
      name,
      origin: "ROOT",
    } as AccountMeta)
    await this.stores.seedPhrase.add(mnemonic, pair.address, pass, confirmed)
    this.stores.password.setPassword(pass)

    try {
      // also derive a first ethereum account
      const derivationPath = "/m/44'/60'/0'/0/0"
      keyring.addUri(
        `${mnemonic}${derivationPath}`,
        pass,
        {
          name: `${name} Ethereum`,
          origin: "DERIVED",
          parent: pair.address,
          derivationPath,
        },
        "ethereum"
      )
    } catch (err) {
      // do not break onboarding as user couldn't recover from it
      console.error(err)
    }

    return await this.stores.app.setOnboarded()
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
      pair.unlock(pass)
      this.stores.password.setPassword(pass)
      return true
    } catch (e) {
      this.stores.password.clearPassword()
      return false
    }
  }

  private getRootAccount() {
    return keyring.getAccounts().find(({ meta }) => meta?.origin === "ROOT")
  }

  private authStatus(): LoggedinType {
    return this.stores.password.isLoggedIn.value
  }

  private lock(): LoggedinType {
    this.stores.password.clearPassword()
    return this.authStatus()
  }

  private async dashboardOpen({ route }: RequestRoute): Promise<boolean> {
    if (!(await this.stores.app.getIsOnboarded())) return this.onboardOpen()
    this.state.openDashboard({ route })
    return true
  }

  private async openModal({ modalType }: ModalOpenParams): Promise<void> {
    const queryUrl = Browser.runtime.getURL("dashboard.html")
    const [tab] = await Browser.tabs.query({ url: queryUrl })
    if (!tab) await this.state.openDashboard({ route: "/accounts" })
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

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
