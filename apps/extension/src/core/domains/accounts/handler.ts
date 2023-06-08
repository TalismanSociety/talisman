import { getPrimaryAccount, sortAccounts } from "@core/domains/accounts/helpers"
import type {
  RequestAccountCreate,
  RequestAccountCreateFromJson,
  RequestAccountCreateFromSeed,
  RequestAccountCreateHardware,
  RequestAccountCreateHardwareEthereum,
  RequestAccountCreateQr,
  RequestAccountCreateWatched,
  RequestAccountExport,
  RequestAccountExportPrivateKey,
  RequestAccountExternalSetIsPortfolio,
  RequestAccountForget,
  RequestAccountRename,
  ResponseAccountExport,
} from "@core/domains/accounts/types"
import { AccountTypes } from "@core/domains/accounts/types"
import { getEthDerivationPath } from "@core/domains/ethereum/helpers"
import { getPairForAddressSafely } from "@core/handlers/helpers"
import { genericSubscription } from "@core/handlers/subscriptions"
import { talismanAnalytics } from "@core/libs/Analytics"
import { ExtensionHandler } from "@core/libs/Handler"
import type { MessageTypes, RequestTypes, ResponseType } from "@core/types"
import { Port } from "@core/types/base"
import { getPrivateKey } from "@core/util/getPrivateKey"
import { createPair } from "@polkadot/keyring"
import { KeyringPair$Json } from "@polkadot/keyring/types"
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
    json,
    password: importedAccountPassword,
  }: RequestAccountCreateFromJson): Promise<string> {
    await sleep(1000)

    const password = this.stores.password.getPassword()
    assert(password, "Not logged in")

    try {
      const parsedJson: KeyringPair$Json = JSON.parse(json)

      const pair = keyring.createFromJson(parsedJson, {
        name: parsedJson.meta?.name || "Json Import",
        origin: AccountTypes.JSON,
      })

      const notExists = !keyring
        .getAccounts()
        .some((acc) => acc.address.toLowerCase() === pair.address.toLowerCase())

      assert(notExists, "Account already exists")

      pair.decodePkcs8(importedAccountPassword)

      delete pair.meta.genesisHash
      pair.meta.whenCreated = Date.now()

      keyring.encryptAccount(pair, password)

      talismanAnalytics.capture("account create", { type: pair.type, method: "json" })
      return pair.address
    } catch (error) {
      throw new Error((error as Error).message)
    }
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

  private accountsCreateQr({ name, address, genesisHash }: RequestAccountCreateQr): string {
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
    const account = keyring.getAccount(address)
    assert(account, "Unable to find account")

    const { type } = keyring.getPair(account?.address)
    talismanAnalytics.capture("account forget", { type })

    keyring.forgetAccount(address)

    // remove associated authorizations
    this.stores.sites.forgetAccount(address)

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
    return genericSubscription<"pri(accounts.subscribe)">(
      id,
      port,
      keyring.accounts.subject,
      sortAccounts
    )
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
      case "pri(accounts.create.hardware.substrate)":
        return this.accountsCreateHardware(request as RequestAccountCreateHardware)
      case "pri(accounts.create.hardware.ethereum)":
        return this.accountsCreateHardwareEthereum(request as RequestAccountCreateHardwareEthereum)
      case "pri(accounts.create.qr.substrate)":
        return this.accountsCreateQr(request as RequestAccountCreateQr)
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
      case "pri(accounts.validateMnemonic)":
        return this.accountValidateMnemonic(request as string)
      case "pri(accounts.setVerifierCertMnemonic)":
        return this.setVerifierCertMnemonic(request as string)
      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
