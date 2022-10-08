import { DEBUG } from "@core/constants"
import { AccountTypes, filterPublicAccounts } from "@core/domains/accounts/helpers"
import type {
  RequestAccountCreate,
  RequestAccountCreateFromJson,
  RequestAccountCreateFromSeed,
  RequestAccountCreateHardware,
  RequestAccountCreateHardwareEthereum,
  RequestAccountExport,
  RequestAccountForget,
  RequestAccountRename,
  ResponseAccountExport,
} from "@core/domains/accounts/types"
import { getEthDerivationPath } from "@core/domains/ethereum/helpers"
import { genericSubscription } from "@core/handlers/subscriptions"
import { talismanAnalytics } from "@core/libs/Analytics"
import { ExtensionHandler } from "@core/libs/Handler"
import type { MessageTypes, RequestTypes, ResponseType } from "@core/types"
import { Port } from "@core/types/base"
import { decodeAnyAddress, encodeAnyAddress } from "@core/util"
import { sleep } from "@core/util/sleep"
import { createPair } from "@polkadot/keyring"
import { KeyringPair$Json } from "@polkadot/keyring/types"
import keyring from "@polkadot/ui-keyring"
import { assert } from "@polkadot/util"
import { ethereumEncode, isEthereumAddress, mnemonicValidate } from "@polkadot/util-crypto"
import { addressFromMnemonic } from "@talisman/util/addressFromMnemonic"

export default class AccountsHandler extends ExtensionHandler {
  private getRootAccount() {
    // TODO this is duplicated in handlers/app.ts
    return keyring.getAccounts().find(({ meta }) => meta?.origin === AccountTypes.ROOT)
  }

  // we can only create a new account if we have an existing root account
  // this account can be identified via the metadata k/v pair: `origin === "ROOT"`
  // requires:
  //   - password
  //   - root account
  //   - derivation path
  //   - account seed (unlocked via password)

  private async accountCreate({ name, type }: RequestAccountCreate): Promise<boolean> {
    const password = await this.stores.password.getPassword()
    assert(password, "Not logged in")

    const allAccounts = keyring.getAccounts()
    const existing = allAccounts.find((account) => account.meta?.name === name)
    assert(!existing, "An account with this name already exists")

    const rootAccount = this.getRootAccount()
    assert(rootAccount, "No root account")

    const isEthereum = type === "ethereum"
    const getDerivationPath = (accountIndex: number) =>
      // for ethereum accounts, use same derivation path as metamask in case user wants to share seed with it
      isEthereum ? getEthDerivationPath(accountIndex) : `//${accountIndex}`

    const rootSeedResult = await this.stores.seedPhrase.getSeed(password)
    if (rootSeedResult.err) throw new Error("Global seed not available")

    const rootSeed = rootSeedResult.val
    let accountIndex
    let derivedAddress: string | null = null
    for (accountIndex = 0; accountIndex <= 1000; accountIndex += 1) {
      derivedAddress = addressFromMnemonic(`${rootSeed}${getDerivationPath(accountIndex)}`, type)

      const exists = keyring.getAccounts().some(({ address }) => address === derivedAddress)
      if (exists) continue

      break
    }

    assert(derivedAddress, "Reached maximum number of derived accounts")

    keyring.addUri(
      `${rootSeed}${getDerivationPath(accountIndex)}`,
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

    return true
  }

  private async accountCreateSeed({
    name,
    seed,
    type,
  }: RequestAccountCreateFromSeed): Promise<boolean> {
    const password = await this.stores.password.getPassword()
    assert(password, "Not logged in")

    // get seed and compare against master seed - cannot import root seed
    const rootSeedResult = await this.stores.seedPhrase.getSeed(password)
    if (rootSeedResult.err) throw new Error("Global seed not available")
    const rootSeed = rootSeedResult.val

    assert(rootSeed !== seed.trim(), "Cannot re-import your master seed")

    const seedAddress = addressFromMnemonic(seed, type)
    const notExists = !keyring.getAccounts().some(({ address }) => address === seedAddress)
    assert(notExists, "Account already exists")

    try {
      keyring.addUri(
        seed,
        password,
        {
          name,
          origin: AccountTypes.SEED,
        },
        type // if undefined, defaults to keyring's default (sr25519 atm)
      )

      talismanAnalytics.capture("account create", { type, method: "seed" })

      return true
    } catch (error) {
      throw new Error((error as Error).message)
    }
  }

  private async accountCreateJson({
    json,
    password: importedAccountPassword,
  }: RequestAccountCreateFromJson): Promise<boolean> {
    await sleep(1000)

    const password = await this.stores.password.getPassword()
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
        origin: AccountTypes.JSON,
      })

      const notExists = !keyring.getAccounts().some(({ address }) => address === pair.address)
      assert(notExists, "Account already exists")

      pair.decodePkcs8(importedAccountPassword)

      delete pair.meta.genesisHash
      pair.meta.whenCreated = Date.now()

      keyring.encryptAccount(pair, password)

      talismanAnalytics.capture("account create", { type: pair.type, method: "json" })
      return true
    } catch (error) {
      throw new Error((error as Error).message)
    }
  }

  private accountsCreateHardwareEthereum({
    name,
    address,
    path,
  }: RequestAccountCreateHardwareEthereum): boolean {
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

    return true
  }

  private accountsCreateHardware({
    accountIndex,
    address,
    addressOffset,
    genesisHash,
    name,
  }: Omit<RequestAccountCreateHardware, "hardwareType">): boolean {
    // TODO check already exists

    // const isEthereum = isEthereumAddress(address)

    // if (isEthereum) {
    //   // ui-keyring's addHardware method only supports substrate accounts, cannot set ethereum type
    //   // => create the pair without helper
    //   const pair = createPair(
    //     {
    //       type: "ethereum",
    //       toSS58: ethereumEncode,
    //     },
    //     {
    //       publicKey: decodeAnyAddress(address),
    //       secretKey: new Uint8Array(),
    //     },
    //     {
    //       accountIndex, // TODO remove ?
    //       addressOffset, // TODO remove ?
    //       name,
    //       hardwareType: "ledger",
    //       isHardware: true,
    //       origin: AccountTypes.HARDWARE,
    //       // TODO specify derivation path here ?
    //     },
    //     null
    //   )

    //   // add to the underlying keyring, allowing not to specify a password
    //   keyring.keyring.addPair(pair)
    //   keyring.saveAccount(pair)
    // } else
    keyring.addHardware(address, "ledger", {
      accountIndex,
      addressOffset,
      genesisHash,
      name,
      origin: AccountTypes.HARDWARE,
    })

    talismanAnalytics.capture("account create", { type: "substrate", method: "hardware" })

    return true
  }

  private accountForget({ address }: RequestAccountForget): boolean {
    const account = keyring.getAccounts().find((acc) => acc.address === address)
    assert(account, "Unable to find account")

    assert(
      AccountTypes.ROOT !== (account.meta.origin as keyof typeof AccountTypes),
      "Cannot forget root account"
    )
    const { type } = keyring.getPair(account?.address)
    talismanAnalytics.capture("account forget", { type })

    keyring.forgetAccount(address)

    // remove associated authorizations
    this.stores.sites.forgetAccount(address)

    return true
  }

  private async accountExport({ address }: RequestAccountExport): Promise<ResponseAccountExport> {
    const password = await this.stores.password.getPassword()
    assert(password, "User not logged in")

    const pair = keyring.getPair(address)
    talismanAnalytics.capture("account export", { type: pair.type })

    return {
      exportedJson: keyring.backupAccount(pair, password),
    }
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
      case "pri(accounts.create.hardware.eth)":
        return this.accountsCreateHardwareEthereum(request as RequestAccountCreateHardwareEthereum)
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
