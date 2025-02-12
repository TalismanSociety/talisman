import { ResponseAccountsExport } from "@polkadot/extension-base/background/types"
import legacyKeyring from "@polkadot/ui-keyring"
import { assert } from "@polkadot/util"
import {
  bytesToString,
  KeypairCurve,
  parseSecretKey,
  parseSuri,
  platformFromAddress,
} from "@talismn/crypto"
import { AccountType, AddAccountKeypairOptions, Mnemonic } from "@talismn/keyring"
import { log } from "extension-shared"
import { combineLatest } from "rxjs"

import type { MessageTypes, RequestTypes, ResponseType } from "../../types"
import type {
  RequestAccountCreate,
  RequestAccountCreateFromJson,
  RequestAccountCreateFromPrivateKey,
  RequestAccountCreateFromSuri,
  RequestAccountExport,
  RequestAccountExportAll,
  RequestAccountExportPrivateKey,
  RequestAccountExternalSetIsPortfolio,
  RequestAccountForget,
  RequestAccountRename,
  RequestAccountsCatalogAction,
  RequestAddAccountDerive,
  RequestAddAccountExternal,
  RequestAddAccountKeypair,
  RequestAddressLookup,
  RequestNextDerivationPath,
  RequestValidateDerivationPath,
  ResponseAccountExport,
} from "./types"
import { genericAsyncSubscription } from "../../handlers/subscriptions"
import { talismanAnalytics } from "../../libs/Analytics"
import { ExtensionHandler } from "../../libs/Handler"
import { Port } from "../../types/base"
import { addressFromSuri } from "../../util/addressFromSuri"
import { isValidDerivationPath } from "../../util/isValidDerivationPath"
import { getSecretKeyFromPjsJson } from "../keyring/getSecretKeyFromPjsJson"
import { pjsKeypairTypeToCurve } from "../keyring/migration-utils"
import { keyringStore } from "../keyring/store"
import { getNextDerivationPathForMnemonicId } from "../keyring/utils"
import { withPjsKeyringPair } from "../keyring/withPjsKeyringPair"
import { withSecretKey } from "../keyring/withSecretKey"
import { formatSuri, sortAccounts } from "./helpers"
import { lookupAddresses, resolveNames } from "./helpers.onChainIds"
import { AccountsCatalogData, emptyCatalog } from "./store.catalog"

// existing values for the method field, prior to keyring migration
type AnalyticsAccountMethod =
  | "derived"
  | "seed"
  | "privateKey"
  | "json"
  | "qr"
  | "hardware"
  | "watched"

export default class AccountsHandler extends ExtensionHandler {
  private async captureAccountCreateEvent(
    address: string,
    method: AccountType | AnalyticsAccountMethod,
  ) {
    let type = "unknown"
    try {
      type = platformFromAddress(address)

      // match with legacy naming
      if (type === "polkadot") type = "substrate"
    } catch (e) {
      log.warn("Unknown encoding for address", address)
    }

    // match with legacy naming
    if (method === "ledger-polkadot") method = "hardware"
    if (method === "ledger-ethereum") method = "hardware"
    if (method === "polkadot-vault") method = "qr"
    if (method === "watch-only") method = "watched"

    talismanAnalytics.capture("account create", {
      type,
      method,
      isOnboarded: await this.stores.app.getIsOnboarded(),
    })
  }

  private async accountCreate({ name, type, ...options }: RequestAccountCreate): Promise<string> {
    const password = await this.stores.password.getPassword()
    assert(password, "Not logged in")

    const accounts = await keyringStore.getAccounts()
    const existing = accounts.find((account) => account.name === name)
    assert(!existing, "An account with this name already exists")

    // let mnemonicId: string
    let mnemonic: Mnemonic
    if ("mnemonicId" in options) {
      const result = await keyringStore.getMnemonic(options.mnemonicId)
      if (!result) throw new Error("Mnemonic not stored locally")
      mnemonic = result
    } else {
      mnemonic = await keyringStore.addMnemonic({
        name: `${name} Recovery Phrase`,
        mnemonic: options.mnemonic,
        confirmed: options.confirmed,
      })
    }

    let derivationPath: string
    if (typeof options.derivationPath === "string") {
      derivationPath = options.derivationPath
    } else {
      const { val, err } = await getNextDerivationPathForMnemonicId(mnemonic.id, type)
      if (err) throw new Error(val)
      else derivationPath = val
    }

    const account = await keyringStore.addAccountDerive({
      curve: pjsKeypairTypeToCurve(type),
      derivationPath,
      mnemonicId: mnemonic.id,
      name,
    })

    this.captureAccountCreateEvent(account.address, "derived")

    return account.address
  }

  private async accountCreateSuri({
    name,
    suri,
    type,
  }: RequestAccountCreateFromSuri): Promise<string> {
    const password = await this.stores.password.getPassword()
    assert(password, "Not logged in")

    // throws if invalid mnemonic
    const parsedSuri = parseSuri(suri)
    if (parsedSuri.password) {
      // TODO: to support this properly, dont store mnemonic and just create it as a keypair that doesnt have a mnemonic
      throw new Error("Password not supported for suri")
    }

    const curve = pjsKeypairTypeToCurve(type ?? "sr25519")

    //suri includes the derivation path if any
    const { mnemonic, derivationPath } = parseSuri(suri)

    let mnemonicId = await keyringStore.getExistingMnemonicId(mnemonic)

    if (!mnemonicId) {
      const result = await keyringStore.addMnemonic({
        name: `${name} Recovery Phrase`,
        mnemonic,
        confirmed: true,
      })
      mnemonicId = result.id
    }

    const account = await keyringStore.addAccountDerive({
      curve,
      derivationPath,
      mnemonicId,
      name,
    })

    this.captureAccountCreateEvent(account.address, "seed")

    return account.address
  }

  private async accountCreatePrivateKey({
    name,
    privateKey,
    type,
  }: RequestAccountCreateFromPrivateKey): Promise<string> {
    const curve = pjsKeypairTypeToCurve(type ?? "sr25519")
    const secretKey = parseSecretKey(privateKey, curve)

    const account = await keyringStore.addAccountKeypair({
      name,
      secretKey,
      curve,
    })

    this.captureAccountCreateEvent(account.address, "privateKey")

    return account.address
  }

  private async accountCreateJson({
    unlockedPairs,
  }: RequestAccountCreateFromJson): Promise<string[]> {
    const password = await this.stores.password.getPassword()
    assert(password, "Not logged in")

    const options: AddAccountKeypairOptions[] = unlockedPairs.map((json) => {
      return {
        name: json.meta?.name || "Json Import",
        curve: json.encoding.content[1] as KeypairCurve,
        secretKey: getSecretKeyFromPjsJson(json, ""),
      }
    })

    const accounts = await keyringStore.addAccountKeypairMulti(options)

    return accounts.map((a) => {
      if (a.type === "keypair") this.captureAccountCreateEvent(a.address, "json")
      return a.address
    })
  }

  private async accountForget({ address }: RequestAccountForget): Promise<boolean> {
    const account = await keyringStore.getAccount(address)
    assert(account, "Unable to find account")

    talismanAnalytics.capture("account forget", {
      type: account.type,
      curve: account.type === "keypair" ? account.curve : undefined,
    })

    await keyringStore.removeAccount(address)

    // remove associated authorizations
    this.stores.sites.forgetAccount(address)

    // remove from accounts catalog store (sorting, folders)
    this.stores.accountsCatalog.removeAccounts([address])

    return true
  }

  private async accountExport({
    address,
    password,
    exportPw,
  }: RequestAccountExport): Promise<ResponseAccountExport> {
    await this.stores.password.checkPassword(password)

    const { err, val } = await withPjsKeyringPair(address, async (pair) => {
      talismanAnalytics.capture("account export", { type: pair.type, mode: "json" })

      return {
        exportedJson: pair.toJson(exportPw),
      }
    })
    if (err) throw new Error(val as string)
    return val
  }

  private async accountExportAll({
    password,
    exportPw,
  }: RequestAccountExportAll): Promise<ResponseAccountsExport> {
    await this.stores.password.checkPassword(password)

    const addresses = legacyKeyring.getPairs().map(({ address }) => address)

    const exportedJson = await legacyKeyring.backupAccounts(addresses, exportPw)

    return { exportedJson }
  }

  private async accountExportPrivateKey({
    address,
    password,
  }: RequestAccountExportPrivateKey): Promise<string> {
    await this.stores.password.checkPassword(password)

    const { err, val } = await withSecretKey(address, async (secretKey, curve) => {
      talismanAnalytics.capture("account export", { type: val, mode: "pk" })

      switch (curve) {
        case "ethereum":
          return bytesToString("hex", secretKey)
        case "solana":
          return bytesToString("base58", secretKey)
        default:
          throw new Error("Unsupported curve")
      }
    })

    if (err) throw new Error(val as string)
    return val
  }

  private async accountExternalSetIsPortfolio({
    address,
    isPortfolio,
  }: RequestAccountExternalSetIsPortfolio): Promise<boolean> {
    await keyringStore.updateAccount(address, { isPortfolio })
    return true
  }

  private async accountRename({ address, name }: RequestAccountRename): Promise<boolean> {
    await keyringStore.updateAccount(address, { name })
    return true
  }

  private accountsSubscribe(id: string, port: Port) {
    return genericAsyncSubscription<"pri(accounts.subscribe)">(
      id,
      port,
      // make sure the sort order is updated when the catalog changes
      combineLatest([keyringStore.accounts$, this.stores.accountsCatalog.observable]),
      ([accounts]) => sortAccounts(this.stores.accountsCatalog)(accounts),
    )
  }

  private accountsCatalogSubscribe(id: string, port: Port) {
    return genericAsyncSubscription<"pri(accounts.catalog.subscribe)">(
      id,
      port,
      // make sure the list of accounts in the catalog is updated when the keyring changes
      combineLatest([keyringStore.accounts$, this.stores.accountsCatalog.observable]),
      async ([, catalog]): Promise<AccountsCatalogData> =>
        // on first start-up, the store (loaded from localstorage) will be empty
        //
        // when this happens, instead of sending `{}` or `undefined` to the frontend,
        // we'll send an empty catalog of the correct type `AccountsCatalogData`
        Object.keys(catalog).length === 0 ? emptyCatalog : catalog,
    )
  }

  private accountsCatalogRunActions(actions: RequestAccountsCatalogAction[]) {
    return this.stores.accountsCatalog.runActions(actions)
  }

  private async addressLookup(lookup: RequestAddressLookup): Promise<string> {
    if ("mnemonicId" in lookup) {
      const { mnemonicId, derivationPath, type } = lookup

      const password = await this.stores.password.getPassword()
      assert(password, "Not logged in")

      const mnemonic = await keyringStore.getMnemonicText(mnemonicId, password)

      const suri = formatSuri(mnemonic, derivationPath)
      return addressFromSuri(suri, type)
    } else {
      const { suri, type } = lookup
      return addressFromSuri(suri, type)
    }
  }

  private validateDerivationPath({ derivationPath, type }: RequestValidateDerivationPath): boolean {
    // TODO
    return isValidDerivationPath(derivationPath, type)
  }

  // TODO do we really need this ? feels like a frontend thing
  private async getNextDerivationPath({
    mnemonicId,
    type, // TODO type => curve
  }: RequestNextDerivationPath): Promise<string> {
    const { val: derivationPath, ok: ok2 } = await getNextDerivationPathForMnemonicId(
      mnemonicId,
      type,
    )
    assert(ok2, "Failed to lookup next available derivation path")

    return derivationPath
  }

  private async accountsAddExternal(options: RequestAddAccountExternal): Promise<string[]> {
    const password = await this.stores.password.getPassword()
    assert(password, "Not logged in")

    const accounts = await keyringStore.addAccountExternalMulti(options)

    for (const account of accounts) this.captureAccountCreateEvent(account.address, account.type)

    return accounts.map((a) => a.address)
  }

  private async accountsAddDerive(options: RequestAddAccountDerive): Promise<string[]> {
    const password = await this.stores.password.getPassword()
    assert(password, "Not logged in")

    const accounts = await keyringStore.addAccountDeriveMulti(options)

    for (const account of accounts) this.captureAccountCreateEvent(account.address, account.type)

    return accounts.map((a) => a.address)
  }

  private async accountsAddKeypair(options: RequestAddAccountKeypair): Promise<string[]> {
    const password = await this.stores.password.getPassword()
    assert(password, "Not logged in")

    const accounts = await keyringStore.addAccountKeypairMulti(options)

    for (const account of accounts) this.captureAccountCreateEvent(account.address, account.type)

    return accounts.map((a) => a.address)
  }

  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
    port: Port,
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      case "pri(accounts.add.external)":
        return this.accountsAddExternal(request as RequestAddAccountExternal)
      case "pri(accounts.add.derive)":
        return this.accountsAddDerive(request as RequestAddAccountDerive)
      case "pri(accounts.add.keypair)":
        return this.accountsAddKeypair(request as RequestAddAccountKeypair)
      case "pri(accounts.create)":
        return this.accountCreate(request as RequestAccountCreate)
      case "pri(accounts.create.suri)":
        return this.accountCreateSuri(request as RequestAccountCreateFromSuri)
      case "pri(accounts.create.privateKey)":
        return this.accountCreatePrivateKey(request as RequestAccountCreateFromPrivateKey)
      case "pri(accounts.create.json)":
        return this.accountCreateJson(request as RequestAccountCreateFromJson)
      case "pri(accounts.external.setIsPortfolio)":
        return this.accountExternalSetIsPortfolio(request as RequestAccountExternalSetIsPortfolio)
      case "pri(accounts.forget)":
        return this.accountForget(request as RequestAccountForget)
      case "pri(accounts.export)":
        return this.accountExport(request as RequestAccountExport)
      case "pri(accounts.export.all)":
        return this.accountExportAll(request as RequestAccountExportAll)
      case "pri(accounts.export.pk)":
        return this.accountExportPrivateKey(request as RequestAccountExportPrivateKey)
      case "pri(accounts.rename)":
        return this.accountRename(request as RequestAccountRename)
      case "pri(accounts.subscribe)":
        return this.accountsSubscribe(id, port)
      case "pri(accounts.catalog.subscribe)":
        return this.accountsCatalogSubscribe(id, port)
      case "pri(accounts.catalog.runActions)":
        return this.accountsCatalogRunActions(request as RequestAccountsCatalogAction[])
      case "pri(accounts.validateDerivationPath)":
        return this.validateDerivationPath(request as RequestValidateDerivationPath)
      case "pri(accounts.address.lookup)":
        return this.addressLookup(request as RequestAddressLookup)
      case "pri(accounts.derivationPath.next)":
        return this.getNextDerivationPath(request as RequestNextDerivationPath)
      case "pri(accounts.onChainIds.resolveNames)":
        return Object.fromEntries(await resolveNames(request as string[]))
      case "pri(accounts.onChainIds.lookupAddresses)":
        return Object.fromEntries(await lookupAddresses(request as string[]))
      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
