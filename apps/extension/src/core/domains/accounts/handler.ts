import type {
  MessageTypes,
  RequestTypes,
  ResponseType,
  Port,
  RequestAccountCreate,
  RequestAccountCreateFromSeed,
  RequestAccountCreateFromJson,
  RequestAccountCreateHardware,
  RequestAccountForget,
  RequestAccountExport,
  ResponseAccountExport,
  RequestAccountRename,
} from "@core/types"
import { filterPublicAccounts } from "@core/domains/accounts/helpers"
import keyring from "@polkadot/ui-keyring"
import { assert } from "@polkadot/util"
import { ExtensionHandler } from "@core/libs/Handler"
import { genericSubscription } from "@core/handlers/subscriptions"
import { mnemonicValidate } from "@polkadot/util-crypto"
import { KeyringPair$Json } from "@polkadot/keyring/types"
import { addressFromMnemonic } from "@talisman/util/addressFromMnemonic"
import { encodeAnyAddress } from "@core/util"
import { DEBUG } from "@core/constants"

export default class AccountsHandler extends ExtensionHandler {
  private getRootAccount() {
    // TODO this is duplicated in handlers/app.ts
    return keyring.getAccounts().find(({ meta }) => meta?.origin === "ROOT")
  }

  // we can only create a new account if we have an existing root account
  // this account can be identified via the metadata k/v pair: `origin === "ROOT"`
  // requires:
  //   - password
  //   - root account
  //   - derivation path
  //   - account seed (unlocked via password)

  private async accountCreate({ name }: RequestAccountCreate): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, DEBUG ? 0 : 1000))
    assert(this.stores.password.hasPassword, "Not logged in")

    const allAccounts = keyring.getAccounts()
    const existing = allAccounts.find((account) => account.meta?.name === name)
    assert(!existing, "An account with this name already exists")

    const rootAccount = this.getRootAccount()
    assert(rootAccount, "No root account")

    const derivationPath =
      allAccounts.filter(
        (account) => account.meta.origin === "ROOT" || account.meta.origin === "DERIVED"
      ).length - 1
    assert(derivationPath >= 0, "Cannot calculate derivation path")

    const password = this.stores.password.getPassword()
    const rootSeed = await this.stores.seedPhrase.getSeed(password || "")
    assert(rootSeed, "Global seed not available")

    keyring.addUri(`${rootSeed}//${derivationPath}`, password, {
      name,
      origin: "DERIVED",
      parent: rootAccount.address,
      derivationPath: derivationPath,
    })

    return true
  }

  private async accountCreateSeed({
    name,
    seed,
    type,
  }: RequestAccountCreateFromSeed): Promise<boolean> {
    const password = this.stores.password.getPassword()
    assert(password, "Not logged in")

    // get seed and compare against master seed - cannot import root seed
    const rootSeed = await this.stores.seedPhrase.getSeed(password)
    assert(rootSeed.trim() !== seed.trim(), "Cannot re-import your master seed")

    const seedAddress = addressFromMnemonic(seed, type)
    const notExists = !keyring.getAccounts().some(({ address }) => address === seedAddress)
    assert(notExists, "Account already exists")

    try {
      keyring.addUri(
        `${seed.trim()}`,
        password,
        {
          name,
          origin: "SEED",
        },
        type // if undefined, defaults to keyring's default (sr25519 atm)
      )
      return true
    } catch (error) {
      throw new Error((error as Error).message)
    }
  }

  private async accountCreateJson({
    json,
    password: importedAccountPassword,
  }: RequestAccountCreateFromJson): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const password = this.stores.password.getPassword()
    assert(password, "Not logged in")

    try {
      const parsedJson: KeyringPair$Json = JSON.parse(json)

      const rootAccount = this.getRootAccount()
      assert(rootAccount, "You have no root account. Please reinstall Talisman and create one.")

      assert(
        encodeAnyAddress(rootAccount.address, 42) !== encodeAnyAddress(parsedJson.address, 42),
        "Cannot re-import your original account"
      )
      const pair = keyring.createFromJson(parsedJson, {
        name: parsedJson.meta?.name || "Json Import",
        origin: "JSON",
      })

      const notExists = !keyring.getAccounts().some(({ address }) => address === pair.address)
      assert(notExists, "Account already exists")

      pair.decodePkcs8(importedAccountPassword)

      delete pair.meta.genesisHash
      pair.meta.whenCreated = Date.now()

      keyring.encryptAccount(pair, password)

      return true
    } catch (error) {
      throw new Error((error as Error).message)
    }
  }

  private accountsCreateHardware({
    accountIndex,
    address,
    addressOffset,
    genesisHash,
    name,
  }: Omit<RequestAccountCreateHardware, "hardwareType">): boolean {
    keyring.addHardware(address, "ledger", {
      accountIndex,
      addressOffset,
      genesisHash,
      name,
      origin: "HARDWARE",
    })

    return true
  }

  private accountForget({ address }: RequestAccountForget): boolean {
    const account = keyring.getAccounts().find((acc) => acc.address === address)

    assert(account, "Unable to find account")

    assert(
      !["ROOT", "DERIVED"].includes(account.meta.origin as string),
      "Cannot forget root or derived accounts"
    )

    keyring.forgetAccount(address)

    // remove associated authorizations
    this.stores.sites.forgetAccount(address)

    return true
  }

  private accountExport({ address }: RequestAccountExport): ResponseAccountExport {
    const password = this.stores.password.getPassword()
    assert(password, "User not logged in")
    return {
      exportedJson: keyring.backupAccount(keyring.getPair(address), password),
    }
  }

  private async accountRename({ address, name }: RequestAccountRename): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const pair = keyring.getPair(address)
    assert(pair, "Unable to find pair")

    const allAccounts = keyring.getAccounts()
    const existing = allAccounts.find(
      (account) => account.address !== address && account.meta?.name === name
    )
    assert(!existing, "An account with this name already exists")

    keyring.saveAccountMeta(pair, { ...pair.meta, name })

    return true
  }

  private accountsSubscribe(id: string, port: Port) {
    return genericSubscription<"pri(accounts.subscribe)">(
      id,
      port,
      keyring.accounts.subject,
      filterPublicAccounts
    )
  }

  private accountValidateMnemonic(mnemonic: string): boolean {
    return mnemonicValidate(mnemonic)
  }

  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
    port: Port
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      case "pri(accounts.create)":
        return this.accountCreate(request as RequestAccountCreate)
      case "pri(accounts.create.seed)":
        return this.accountCreateSeed(request as RequestAccountCreateFromSeed)
      case "pri(accounts.create.json)":
        return this.accountCreateJson(request as RequestAccountCreateFromJson)
      case "pri(accounts.create.hardware)":
        return this.accountsCreateHardware(request as RequestAccountCreateHardware)
      case "pri(accounts.forget)":
        return this.accountForget(request as RequestAccountForget)
      case "pri(accounts.export)":
        return this.accountExport(request as RequestAccountExport)
      case "pri(accounts.rename)":
        return this.accountRename(request as RequestAccountRename)
      case "pri(accounts.subscribe)":
        return this.accountsSubscribe(id, port)
      case "pri(accounts.validateMnemonic)":
        return this.accountValidateMnemonic(request as string)
      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
