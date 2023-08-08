import { getPrimaryAccount, isValidAnyAddress, sortAccounts } from "@core/domains/accounts/helpers"
import type {
  RequestAccountCreate,
  RequestAccountCreateDcent,
  RequestAccountCreateExternal,
  RequestAccountCreateFromJson,
  RequestAccountCreateFromSeed,
  RequestAccountCreateHardware,
  RequestAccountCreateHardwareEthereum,
  RequestAccountCreateWatched,
  RequestAccountExport,
  RequestAccountExportPrivateKey,
  RequestAccountExternalSetIsPortfolio,
  RequestAccountForget,
  RequestAccountRename,
  RequestAccountsCatalogAction,
  ResponseAccountExport,
} from "@core/domains/accounts/types"
import { AccountTypes } from "@core/domains/accounts/types"
import { getEthDerivationPath } from "@core/domains/ethereum/helpers"
import { getPairForAddressSafely } from "@core/handlers/helpers"
import { genericAsyncSubscription } from "@core/handlers/subscriptions"
import { talismanAnalytics } from "@core/libs/Analytics"
import { ExtensionHandler } from "@core/libs/Handler"
import { chaindataProvider } from "@core/rpcs/chaindata"
import type { MessageTypes, RequestTypes, ResponseType } from "@core/types"
import { Port } from "@core/types/base"
import { getPrivateKey } from "@core/util/getPrivateKey"
import { createPair, encodeAddress } from "@polkadot/keyring"
import { KeyringPair$Meta } from "@polkadot/keyring/types"
import keyring from "@polkadot/ui-keyring"
import { assert } from "@polkadot/util"
import {
  ethereumEncode,
  isEthereumAddress,
  mnemonicGenerate,
  mnemonicValidate,
} from "@polkadot/util-crypto"
import { addressFromMnemonic } from "@talisman/util/addressFromMnemonic"
import { decodeAnyAddress, encodeAnyAddress, sleep } from "@talismn/util"
import { combineLatest } from "rxjs"

import { AccountsCatalogData, emptyCatalog } from "./store.catalog"

export default class AccountsHandler extends ExtensionHandler {
  // we can only create a new account if we have an existing stored seed
  // requires:
  //   - password
  //   - stored seed (unlocked with password)
  //   - derivation path

  private async accountCreate({ name, type }: RequestAccountCreate): Promise<string> {
    const password = this.stores.password.getPassword()
    assert(password, "Not logged in")

    const allAccounts = keyring.getAccounts()
    const existing = allAccounts.find((account) => account.meta?.name === name)
    assert(!existing, "An account with this name already exists")

    const rootAccount = getPrimaryAccount(true)

    const isEthereum = type === "ethereum"
    const getDerivationPath = (accountIndex: number) =>
      // for ethereum accounts, use same derivation path as metamask in case user wants to share seed with it
      isEthereum ? getEthDerivationPath(accountIndex) : `//${accountIndex}`

    const seedResult = await this.stores.seedPhrase.getSeed(password)
    if (seedResult.err) throw new Error(seedResult.val)

    let seed = seedResult.val
    let shouldStoreSeed = false
    // currently shouldn't be possible to not have a seed, but it will be soon
    if (!seed) {
      seed = mnemonicGenerate()
      shouldStoreSeed = true
    }

    // currently shouldn't be possible to not have a root account, but it will be soon
    if (!rootAccount) {
      const { pair } = keyring.addUri(seed, password, {
        name,
        origin: AccountTypes.TALISMAN,
      })
      talismanAnalytics.capture("account create", { type, method: "parent" })
      if (shouldStoreSeed) await this.stores.seedPhrase.add(seed, password)
      return pair.address
    } else {
      let accountIndex
      let derivedAddress: string | null = null
      for (accountIndex = 0; accountIndex <= 1000; accountIndex += 1) {
        derivedAddress = addressFromMnemonic(`${seed}${getDerivationPath(accountIndex)}`, type)

        const exists = keyring.getAccounts().some(({ address }) => address === derivedAddress)
        if (exists) continue

        break
      }

      assert(derivedAddress, "Reached maximum number of derived accounts")

      const { pair } = keyring.addUri(
        `${seed}${getDerivationPath(accountIndex)}`,
        password,
        {
          name,
          origin: AccountTypes.DERIVED,
          parent: rootAccount.address,
          derivationPath: getDerivationPath(accountIndex),
        },
        type
      )

      talismanAnalytics.capture("account create", { type, method: "derived" })
      return pair.address
    }
  }

  private async accountCreateSeed({
    name,
    seed,
    type,
  }: RequestAccountCreateFromSeed): Promise<string> {
    const password = this.stores.password.getPassword()
    assert(password, "Not logged in")

    // get seed and compare against master seed - cannot import root seed
    const rootSeedResult = await this.stores.seedPhrase.getSeed(password)
    if (rootSeedResult.err) throw new Error("Global seed not available")
    const rootSeed = rootSeedResult.val

    assert(rootSeed !== seed.trim(), "Cannot re-import your master seed")

    const seedAddress = addressFromMnemonic(seed, type)

    const notExists = !keyring
      .getAccounts()
      .some((acc) => acc.address.toLowerCase() === seedAddress.toLowerCase())
    assert(notExists, "Account already exists")

    try {
      const { pair } = keyring.addUri(
        seed,
        password,
        {
          name,
          origin: AccountTypes.SEED,
        },
        type // if undefined, defaults to keyring's default (sr25519 atm)
      )

      talismanAnalytics.capture("account create", { type, method: "seed" })

      return pair.address
    } catch (error) {
      throw new Error((error as Error).message)
    }
  }

  private async accountCreateJson({
    unlockedPairs,
  }: RequestAccountCreateFromJson): Promise<string[]> {
    const password = this.stores.password.getPassword()
    assert(password, "Not logged in")

    const addresses = []
    for (const json of unlockedPairs) {
      const pair = keyring.createFromJson(json, {
        name: json.meta?.name || "Json Import",
        origin: AccountTypes.JSON,
      })

      const notExists = !keyring
        .getAccounts()
        .some((acc) => acc.address.toLowerCase() === pair.address.toLowerCase())

      assert(notExists, "Account already exists")

      // unlocked pairs need to be decoded with blank password to be considered unlocked
      pair.decodePkcs8("")

      delete pair.meta.genesisHash
      pair.meta.whenCreated = Date.now()

      keyring.encryptAccount(pair, password)
      addresses.push(pair.address)

      talismanAnalytics.capture("account create", { type: pair.type, method: "json" })
    }

    return addresses
  }

  private accountsCreateHardwareEthereum({
    name,
    address,
    path,
  }: RequestAccountCreateHardwareEthereum): string {
    assert(isEthereumAddress(address), "Not an Ethereum address")

    // ui-keyring's addHardware method only supports substrate accounts, cannot set ethereum type
    // => create the pair without helper
    const pair = createPair(
      {
        type: "ethereum",
        toSS58: ethereumEncode,
      },
      {
        publicKey: decodeAnyAddress(address),
        secretKey: new Uint8Array(),
      },
      {
        name,
        hardwareType: "ledger",
        isHardware: true,
        origin: AccountTypes.HARDWARE,
        path,
      },
      null
    )

    // add to the underlying keyring, allowing not to specify a password
    keyring.keyring.addPair(pair)
    keyring.saveAccount(pair)

    talismanAnalytics.capture("account create", { type: "ethereum", method: "hardware" })

    return pair.address
  }

  private async accountCreateDcent({
    name,
    address,
    type,
    path,
    tokenIds,
  }: RequestAccountCreateDcent) {
    if (type === "ethereum") assert(isEthereumAddress(address), "Not an Ethereum address")
    else assert(isValidAnyAddress(address), "Not a Substrate address")

    const meta: KeyringPair$Meta = {
      name,
      isHardware: true,
      origin: AccountTypes.DCENT,
      path,
      tokenIds,
    }

    // hopefully in the future D'CENT will be able to sign on any chain, and code below can be simply removed.
    // keep this basic check for now to avoid polluting the messaging interface, as polkadot is the only token supported by D'CENT.
    if (tokenIds.length === 1 && tokenIds[0] === "polkadot-substrate-native-dot") {
      const chain = await chaindataProvider.getChain("polkadot")
      meta.genesisHash = chain?.genesisHash
    }

    // ui-keyring's addHardware method only supports substrate accounts, cannot set ethereum type
    // => create the pair without helper
    const pair = createPair(
      {
        type,
        toSS58: type === "ethereum" ? ethereumEncode : encodeAddress,
      },
      {
        publicKey: decodeAnyAddress(address),
        secretKey: new Uint8Array(),
      },
      meta,
      null
    )

    // add to the underlying keyring, allowing not to specify a password
    keyring.keyring.addPair(pair)
    keyring.saveAccount(pair)

    talismanAnalytics.capture("account create", { type, method: "dcent" })

    return pair.address
  }

  private accountsCreateHardware({
    accountIndex,
    address,
    addressOffset,
    genesisHash,
    name,
  }: Omit<RequestAccountCreateHardware, "hardwareType">): string {
    const { pair } = keyring.addHardware(address, "ledger", {
      accountIndex,
      addressOffset,
      genesisHash,
      name,
      origin: AccountTypes.HARDWARE,
    })

    talismanAnalytics.capture("account create", { type: "substrate", method: "hardware" })

    return pair.address
  }

  private accountsCreateQr({ name, address, genesisHash }: RequestAccountCreateExternal): string {
    const password = this.stores.password.getPassword()
    assert(password, "Not logged in")

    const exists = keyring
      .getAccounts()
      .some((account) => encodeAnyAddress(account.address) === encodeAnyAddress(address))
    assert(!exists, "Account already exists")

    const { pair } = keyring.addExternal(address, {
      isQr: true,
      name,
      genesisHash,
      origin: AccountTypes.QR,
    })

    talismanAnalytics.capture("account create", { type: "substrate", method: "qr" })

    return pair.address
  }

  private accountCreateWatched({
    name,
    address,
    isPortfolio,
  }: RequestAccountCreateWatched): string {
    const password = this.stores.password.getPassword()
    assert(password, "Not logged in")

    const safeAddress = encodeAnyAddress(address)

    const exists = keyring
      .getAccounts()
      .some((account) => encodeAnyAddress(account.address) === safeAddress)
    assert(!exists, "Account already exists")

    // ui-keyring's addExternal method only supports substrate accounts, cannot set ethereum type
    // => create the pair without helper
    const pair = createPair(
      isEthereumAddress(safeAddress)
        ? { type: "ethereum", toSS58: ethereumEncode }
        : { type: "sr25519", toSS58: keyring.encodeAddress },
      {
        publicKey: decodeAnyAddress(address),
        secretKey: new Uint8Array(),
      },
      {
        name,
        isExternal: true,
        isPortfolio: !!isPortfolio,
        origin: AccountTypes.WATCHED,
      },
      null
    )

    // add to the underlying keyring, allowing not to specify a password
    keyring.keyring.addPair(pair)
    keyring.saveAccount(pair)

    talismanAnalytics.capture("add watched account", {
      type: isEthereumAddress(safeAddress) ? "ethereum" : "substrate",
      method: "watched",
    })

    return pair.address
  }

  private accountForget({ address }: RequestAccountForget): boolean {
    const encodedAddress = encodeAnyAddress(address)
    const account = keyring.getAccount(encodedAddress)
    assert(account, "Unable to find account")

    const { type } = keyring.getPair(account?.address)
    talismanAnalytics.capture("account forget", { type })

    keyring.forgetAccount(address)

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

    const { err, val } = await getPairForAddressSafely(address, async (pair) => {
      talismanAnalytics.capture("account export", { type: pair.type, mode: "json" })

      const exportedJson = pair.toJson(exportPw)

      // exporting the json causes the keypair to be re-encoded with the export password, which we do not want, so we re-re-encode it with the proper one
      pair.toJson(await this.stores.password.transformPassword(password))

      return {
        exportedJson,
      }
    })
    if (err) throw new Error(val as string)
    return val
  }

  private async accountExportPrivateKey({
    address,
    password,
  }: RequestAccountExportPrivateKey): Promise<string> {
    await this.stores.password.checkPassword(password)

    const pw = await this.stores.password.getPassword()

    const { err, val } = await getPairForAddressSafely(address, async (pair) => {
      assert(pair.type === "ethereum", "Private key cannot be exported for this account type")

      const pk = getPrivateKey(pair, pw as string)

      talismanAnalytics.capture("account export", { type: pair.type, mode: "pk" })

      return pk.toString("hex")
    })

    if (err) throw new Error(val as string)
    return val
  }

  private async accountExternalSetIsPortfolio({
    address,
    isPortfolio,
  }: RequestAccountExternalSetIsPortfolio): Promise<boolean> {
    await sleep(1000)

    const pair = keyring.getPair(address)
    assert(pair, "Unable to find pair")

    keyring.saveAccountMeta(pair, { ...pair.meta, isPortfolio })

    return true
  }

  private async accountRename({ address, name }: RequestAccountRename): Promise<boolean> {
    await sleep(1000)

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
    return genericAsyncSubscription<"pri(accounts.subscribe)">(
      id,
      port,
      // make sure the sort order is updated when the catalog changes
      combineLatest([keyring.accounts.subject, this.stores.accountsCatalog.observable]),
      ([accounts]) => sortAccounts(this.stores.accountsCatalog)(accounts)
    )
  }

  private accountsCatalogSubscribe(id: string, port: Port) {
    return genericAsyncSubscription<"pri(accounts.catalog.subscribe)">(
      id,
      port,
      // make sure the list of accounts in the catalog is updated when the keyring changes
      combineLatest([keyring.accounts.subject, this.stores.accountsCatalog.observable]),
      async ([, catalog]): Promise<AccountsCatalogData> =>
        // on first start-up, the store (loaded from localstorage) will be empty
        //
        // when this happens, instead of sending `{}` or `undefined` to the frontend,
        // we'll send an empty catalog of the correct type `AccountsCatalogData`
        Object.keys(catalog).length === 0 ? emptyCatalog : catalog
    )
  }

  private accountsCatalogRunActions(actions: RequestAccountsCatalogAction[]) {
    return this.stores.accountsCatalog.runActions(actions)
  }

  private accountValidateMnemonic(mnemonic: string): boolean {
    return mnemonicValidate(mnemonic)
  }

  private async setVerifierCertMnemonic(mnemonic: string) {
    const isValidMnemonic = mnemonicValidate(mnemonic)
    assert(isValidMnemonic, "Invalid mnemonic")
    const password = this.stores.password.getPassword()
    if (!password) throw new Error("Unauthorised")
    await this.stores.verifierCertificateMnemonic.add(mnemonic, password)
    return true
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
      case "pri(accounts.create.dcent)":
        return this.accountCreateDcent(request as RequestAccountCreateDcent)
      case "pri(accounts.create.hardware.substrate)":
        return this.accountsCreateHardware(request as RequestAccountCreateHardware)
      case "pri(accounts.create.hardware.ethereum)":
        return this.accountsCreateHardwareEthereum(request as RequestAccountCreateHardwareEthereum)
      case "pri(accounts.create.qr.substrate)":
        return this.accountsCreateQr(request as RequestAccountCreateExternal)
      case "pri(accounts.create.watched)":
        return this.accountCreateWatched(request as RequestAccountCreateWatched)
      case "pri(accounts.external.setIsPortfolio)":
        return this.accountExternalSetIsPortfolio(request as RequestAccountExternalSetIsPortfolio)
      case "pri(accounts.forget)":
        return this.accountForget(request as RequestAccountForget)
      case "pri(accounts.export)":
        return this.accountExport(request as RequestAccountExport)
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
      case "pri(accounts.validateMnemonic)":
        return this.accountValidateMnemonic(request as string)
      case "pri(accounts.setVerifierCertMnemonic)":
        return this.setVerifierCertMnemonic(request as string)
      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
