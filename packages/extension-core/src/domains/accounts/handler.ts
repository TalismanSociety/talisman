import { ResponseAccountsExport } from "@polkadot/extension-base/background/types"
import { KeyringPair$Json } from "@polkadot/keyring/types"
import { KeyringPairs$Json } from "@polkadot/ui-keyring/types"
import { assert, objectSpread, stringToU8a } from "@polkadot/util"
import { jsonEncrypt } from "@polkadot/util-crypto"
import {
  addressFromMnemonic,
  base58,
  base64,
  getAccountPlatformFromAddress,
  hex,
  KeypairCurve,
} from "@talismn/crypto"
import { getPublicKeySolana } from "@talismn/crypto/src/derivation/deriveSolana"
import { AccountType, AddAccountKeypairOptions } from "@talismn/keyring"
import { log } from "extension-shared"
import { combineLatest } from "rxjs"

import type { MessageTypes, RequestTypes, ResponseType } from "../../types"
import type {
  RequestAccountContactUpdate,
  RequestAccountCreateFromJson,
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
  ResponseAccountExport,
} from "./types"
import { genericAsyncSubscription } from "../../handlers/subscriptions"
import { talismanAnalytics } from "../../libs/Analytics"
import { ExtensionHandler } from "../../libs/Handler"
import { Port } from "../../types/base"
import { getSecretKeyFromPjsJson } from "../keyring/getSecretKeyFromPjsJson"
import { keyringStore } from "../keyring/store"
import { getNextDerivationPathForMnemonicId } from "../keyring/utils"
import { withPjsKeyringPair } from "../keyring/withPjsKeyringPair"
import { withSecretKey } from "../keyring/withSecretKey"
import { sortAccounts } from "./helpers"
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
      type = getAccountPlatformFromAddress(address)

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
    this.stores.accountsCatalog.syncAccounts(await keyringStore.getAccounts())

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

  /**
   * Exports all hot accounts to a json file using p.js compatible json format.
   */
  private async accountExportAll({
    password,
    exportPw,
  }: RequestAccountExportAll): Promise<ResponseAccountsExport> {
    await this.stores.password.checkPassword(password)

    const accounts = await keyringStore.getAccounts()

    const accountsToExport = accounts.filter(
      (account) =>
        // export only keypair accounts, others have metadata that are specific to each wallet
        account.type === "keypair" &&
        // only export pjs compatible accounts to be compatible with pjs json format
        ["sr25519", "ed25519", "ecdsa", "ethereum"].includes(account.curve),
    )

    const jsonAccounts: KeyringPair$Json[] = []

    // fetch secretKeys sequentially to avoid lock issues
    for (const { address } of accountsToExport) {
      const { err, val } = await withPjsKeyringPair(address, (pair) => pair.toJson(exportPw))
      if (err) throw new Error(val as string)
      jsonAccounts.push(val)
    }

    // export accounts the same way as keyring.backupAccounts() from @polkadot/ui-keyring
    const exportedJson = objectSpread(
      {},
      jsonEncrypt(stringToU8a(JSON.stringify(jsonAccounts)), ["batch-pkcs8"], exportPw),
      {
        accounts: jsonAccounts.map((account) => ({
          address: account.address,
          meta: account.meta,
        })),
      },
    ) as KeyringPairs$Json

    return { exportedJson }
  }

  private async accountExportPrivateKey({
    address,
    password,
  }: RequestAccountExportPrivateKey): Promise<string> {
    await this.stores.password.checkPassword(password)

    const { err, val } = await withSecretKey(address, async (secretKey, curve) => {
      talismanAnalytics.capture("account export", { type: curve, mode: "pk" })

      switch (curve) {
        case "ethereum":
          return hex.encode(secretKey)
        case "solana":
          return base58.encode(new Uint8Array([...secretKey, ...getPublicKeySolana(secretKey)]))
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
    switch (lookup.type) {
      case "mnemonicId": {
        const { mnemonicId, derivationPath, curve } = lookup

        const password = await this.stores.password.getPassword()
        assert(password, "Not logged in")

        const mnemonic = await keyringStore.getMnemonicText(mnemonicId, password)

        return addressFromMnemonic(mnemonic, derivationPath, curve)
      }
      case "mnemonic": {
        const { mnemonic, derivationPath, curve } = lookup
        return addressFromMnemonic(mnemonic, derivationPath, curve)
      }
    }
  }

  private async getNextDerivationPath({
    mnemonicId,
    curve,
  }: RequestNextDerivationPath): Promise<string> {
    const { val: derivationPath, ok } = await getNextDerivationPathForMnemonicId(mnemonicId, curve)
    assert(ok, "Failed to lookup next available derivation path")

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

    const deserializedOptions = options.map((o) => ({
      ...o,
      secretKey: base64.decode(o.secretKey),
    }))

    const accounts = await keyringStore.addAccountKeypairMulti(deserializedOptions)

    for (const account of accounts) this.captureAccountCreateEvent(account.address, account.type)

    return accounts.map((a) => a.address)
  }

  private async updateContact({ address, name, genesisHash }: RequestAccountContactUpdate) {
    const account = await keyringStore.getAccount(address)
    if (account?.type !== "contact") throw new Error("Contact not found")

    await keyringStore.updateAccount(address, { name, genesisHash })

    return true
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
      case "pri(accounts.update.contact)":
        return this.updateContact(request as RequestAccountContactUpdate)
      case "pri(accounts.subscribe)":
        return this.accountsSubscribe(id, port)
      case "pri(accounts.catalog.subscribe)":
        return this.accountsCatalogSubscribe(id, port)
      case "pri(accounts.catalog.runActions)":
        return this.accountsCatalogRunActions(request as RequestAccountsCatalogAction[])
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
