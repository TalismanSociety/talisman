import { AccountsStore } from "@polkadot/extension-base/stores"
import keyring from "@polkadot/ui-keyring"
import { cryptoWaitReady } from "@polkadot/util-crypto"
import { watCryptoWaitReady } from "@talismn/scale"

import {
  LegacyAccountType as AccountType,
  LegacyAccountTypes as AccountTypes,
} from "../../domains/accounts/migrations"
import { AccountAddressType } from "../../domains/accounts/types"
import { passwordStore } from "../../domains/app/store.password"
import { getEthDerivationPath } from "../../domains/ethereum/helpers"
import { createLegacySeedPhraseStore } from "../../domains/mnemonics/legacy/store"
import { migratePasswordV1ToV2 } from "./legacyMigrations"

const mnemonic = "seed sock milk update focus rotate barely fade car face mechanic mercy"
const password = "passw0rd"

const createPair = (
  origin: AccountType = AccountTypes.TALISMAN,
  derivationPath = "",
  parent?: string,
  type: AccountAddressType = "sr25519"
) => {
  const slashDerivationPath = `${type === "sr25519" ? "//" : ""}${derivationPath}`
  const options = {
    parent: origin === AccountTypes.TALISMAN ? undefined : parent,
    derivationPath: origin === AccountTypes.TALISMAN ? undefined : slashDerivationPath,
  }

  const { pair } = keyring.addUri(
    `${mnemonic}${origin === AccountTypes.DERIVED ? slashDerivationPath : ""}`,
    password,
    {
      name: `Test Account: ${derivationPath}`,
      origin,
      ...options,
    },
    type
  )
  return pair
}

describe("App migrations", () => {
  beforeAll(async () => {
    await Promise.all([
      // wait for `@polkadot/util-crypto` to be ready (it needs to load some wasm)
      cryptoWaitReady(),
      // wait for `@talismn/scale` to be ready (it needs to load some wasm)
      watCryptoWaitReady(),
    ])

    keyring.loadAll({ store: new AccountsStore() })
  })

  test("migrate password v1 -> v2", async () => {
    expect(await passwordStore.get("isHashed")).toBe(false)

    // create some substrate accounts
    const rootAccount = createPair()
    const indices = [1, 2]
    indices.forEach((index) => {
      createPair(AccountTypes.DERIVED, `${index}`, rootAccount.address)
    })
    // create an ethereum account
    createPair(AccountTypes.DERIVED, getEthDerivationPath(), rootAccount.address, "ethereum")
    const seedPhraseStore = createLegacySeedPhraseStore()
    // create a seedphrase encrypted with the plaintext password
    await seedPhraseStore.add(mnemonic, password, true)

    // ensure can decrypt keypair
    rootAccount.decodePkcs8(password)
    rootAccount.lock()

    //run migration
    const result = await migratePasswordV1ToV2(password)
    expect(result).toBeTruthy()

    expect(await passwordStore.get("isHashed")).toBe(true)

    const hashedPw = await passwordStore.getPassword()
    expect(hashedPw === "$2a$13$7AHTA/Vs6L.Yhj0P12wlo.nV9cP0/YiID9TtHCjLroCQdETKafqVa")
    expect(hashedPw !== password)
    const newRootAccounts = keyring
      .getPairs()
      .filter(({ meta }) => meta.origin === AccountTypes.TALISMAN)
    expect(newRootAccounts.length === 1)
    const newRootAccount = newRootAccounts[0]

    newRootAccount.decodePkcs8(hashedPw)
    expect(!newRootAccount.isLocked)
  })
})

// load bearing export
export {}
