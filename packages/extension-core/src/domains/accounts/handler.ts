import { ResponseAccountsExport } from "@polkadot/extension-base/background/types"
import { createPair, encodeAddress } from "@polkadot/keyring"
import legacyKeyring from "@polkadot/ui-keyring"
import { assert } from "@polkadot/util"
import { isEthereumAddress } from "@polkadot/util-crypto"
import {
  bytesToString,
  detectAddressEncoding,
  KeypairCurve,
  parseSecretKey,
  parseSuri,
} from "@talismn/crypto"
import { AddAccountKeypairOptions, Mnemonic } from "@talismn/keyring"
import { decodeAnyAddress } from "@talismn/util"
import { log } from "extension-shared"
import { combineLatest } from "rxjs"

import type { MessageTypes, RequestTypes, ResponseType } from "../../types"
import type {
  RequestAccountCreate,
  RequestAccountCreateFromJson,
  RequestAccountCreateFromPrivateKey,
  RequestAccountCreateFromSuri,
  RequestAccountCreateLedgerEthereum,
  RequestAccountCreateLedgerSubstrate,
  RequestAccountCreateQr,
  RequestAccountCreateSignet,
  RequestAccountCreateWatched,
  RequestAccountExport,
  RequestAccountExportAll,
  RequestAccountExportPrivateKey,
  RequestAccountExternalSetIsPortfolio,
  RequestAccountForget,
  RequestAccountRename,
  RequestAccountsCatalogAction,
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
import { LegacyAccountOrigin, SubstrateLedgerAppType } from "./types"

export default class AccountsHandler extends ExtensionHandler {
  private async captureAccountCreateEvent(address: string, method: string) {
    let type = "unknown"
    try {
      const encoding = detectAddressEncoding(address)
      type = encoding === "ss58" ? "substrate" : (encoding as string)
    } catch (e) {
      log.warn("Unknown encoding for address", address)
    }

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

    let derivedMnemonicId = await keyringStore.getExistingMnemonicId(mnemonic)

    if (!derivedMnemonicId) {
      const result = await keyringStore.addMnemonic({
        name: `${name} Recovery Phrase`,
        mnemonic,
        confirmed: true,
      })
      derivedMnemonicId = result.id
    }

    const account = await keyringStore.addAccountDerive({
      curve,
      derivationPath,
      mnemonicId: derivedMnemonicId,
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

    const accounts = await keyringStore.addAccountKeypairs(options)

    return accounts.map((a) => {
      if (a.type === "keypair") this.captureAccountCreateEvent(a.address, "json")
      return a.address
    })
  }

  private async accountsCreateLedgerEthereum({
    name,
    address,
    path: derivationPath,
  }: RequestAccountCreateLedgerEthereum) {
    assert(isEthereumAddress(address), "Not an Ethereum address")

    const account = await keyringStore.addAccountExternal({
      type: "ledger-ethereum",
      name,
      address,
      derivationPath,
    })

    this.captureAccountCreateEvent(account.address, "hardware")

    return account.address
  }

  private async accountsCreateLedgerSubstrate(
    request: RequestAccountCreateLedgerSubstrate,
  ): Promise<string> {
    const { address, accountIndex, addressOffset, ledgerApp, name } = request

    const genesisHash =
      request.ledgerApp === SubstrateLedgerAppType.Legacy ? request.genesisHash : undefined

    const account = await keyringStore.addAccountExternal({
      type: "ledger-polkadot",
      name,
      address,
      accountIndex,
      addressOffset,
      app: ledgerApp,
      genesisHash,
    })

    this.captureAccountCreateEvent(account.address, "hardware")

    return account.address
  }

  private async accountsCreateQr({
    name,
    address,
    genesisHash,
  }: RequestAccountCreateQr): Promise<string> {
    const password = await this.stores.password.getPassword()
    assert(password, "Not logged in")

    // TODO: Hit up PVault devs with the following test case:
    //
    // 1. Add Moonbeam chainspec & metadata via https://metadata.novasama.io
    // 2. Create Moonbeam account in the vault
    // 3. Connect Moonbeam account to https://polkadot.js.org/apps/
    // 4. Prepare a transfer TX to be signed by the vault
    // 5. Scan the QR code with the vault, and note the `Please Add The Network You Want To Transact in` error
    //
    // When step (5) no longer shows this error, try the above steps but using Talisman instead of Novasama's metadata portal & pjs apps.
    // Fix any issues in the Talisman implementation, then remove the following `assert()`
    assert(
      !isEthereumAddress(address),
      "Ethereum-style accounts are not yet able to sign transactions in Polkadot Vault",
    )

    const account = await keyringStore.addAccountExternal({
      type: "polkadot-vault",
      name,
      address,
      genesisHash,
    })

    this.captureAccountCreateEvent(address, "qr")

    return account.address
  }

  private async accountCreateWatched({
    name,
    address,
    isPortfolio,
  }: RequestAccountCreateWatched): Promise<string> {
    const password = await this.stores.password.getPassword()
    assert(password, "Not logged in")

    const account = await keyringStore.addAccountExternal({
      type: "watch-only",
      name,
      address,
      isPortfolio,
    })

    this.captureAccountCreateEvent(address, "watched")

    return account.address
  }

  private accountsCreateSignet({
    address,
    genesisHash,
    name,
    signetUrl,
  }: RequestAccountCreateSignet) {
    const pair = createPair(
      {
        type: "sr25519",
        toSS58: encodeAddress,
      },
      {
        publicKey: decodeAnyAddress(address),
        secretKey: new Uint8Array(),
      },
      {
        name,
        genesisHash,
        signetUrl,
        origin: LegacyAccountOrigin.Signet,
        isPortfolio: false,
      },
      null,
    )

    legacyKeyring.keyring.addPair(pair)
    legacyKeyring.saveAccount(pair)

    this.captureAccountCreateEvent(pair.address, "signet")

    return pair.address
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
      //combineLatest([legacyKeyring.accounts.subject, this.stores.accountsCatalog.observable]),
      combineLatest([keyringStore.accounts$, this.stores.accountsCatalog.observable]),
      ([accounts]) => sortAccounts(this.stores.accountsCatalog)(accounts),
    )
  }

  private accountsCatalogSubscribe(id: string, port: Port) {
    return genericAsyncSubscription<"pri(accounts.catalog.subscribe)">(
      id,
      port,
      // make sure the list of accounts in the catalog is updated when the keyring changes
      combineLatest([legacyKeyring.accounts.subject, this.stores.accountsCatalog.observable]),
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

  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
    port: Port,
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      case "pri(accounts.create)":
        return this.accountCreate(request as RequestAccountCreate)
      case "pri(accounts.create.suri)":
        return this.accountCreateSuri(request as RequestAccountCreateFromSuri)
      case "pri(accounts.create.privateKey)":
        return this.accountCreatePrivateKey(request as RequestAccountCreateFromPrivateKey)
      case "pri(accounts.create.json)":
        return this.accountCreateJson(request as RequestAccountCreateFromJson)
      case "pri(accounts.create.ledger.substrate)":
        return this.accountsCreateLedgerSubstrate(request as RequestAccountCreateLedgerSubstrate)
      case "pri(accounts.create.ledger.ethereum)":
        return this.accountsCreateLedgerEthereum(request as RequestAccountCreateLedgerEthereum)
      case "pri(accounts.create.qr)":
        return this.accountsCreateQr(request as RequestAccountCreateQr)
      case "pri(accounts.create.watched)":
        return this.accountCreateWatched(request as RequestAccountCreateWatched)
      case "pri(accounts.create.signet)":
        return this.accountsCreateSignet(request as RequestAccountCreateSignet)
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
