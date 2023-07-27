import { AccountsCatalogStore } from "@core/domains/accounts/store.catalog"
import { Account } from "@core/domains/accounts/types"
import {
  AccountJsonAny,
  AccountType,
  AccountTypes,
  IdenticonType,
  storedSeedAccountTypes,
} from "@core/domains/accounts/types"
import type { Address } from "@core/types/base"
import { getAccountAvatarDataUri } from "@core/util/getAccountAvatarDataUri"
import { canDerive } from "@polkadot/extension-base/utils"
import type { InjectedAccount } from "@polkadot/extension-inject/types"
import keyring from "@polkadot/ui-keyring"
import type { SingleAddress, SubjectInfo } from "@polkadot/ui-keyring/observable/types"
import Browser from "webextension-polyfill"

import seedPhraseStore from "./store"
import { verifierCertificateMnemonicStore } from "./store.verifierCertificateMnemonic"

const sortAccountsByWhenCreated = (accounts: AccountJsonAny[]) => {
  return accounts.sort((acc1, acc2) => {
    const acc1Created = acc1.whenCreated
    const acc2Created = acc2.whenCreated

    if (!acc1Created || !acc2Created) {
      return 0
    }

    if (acc1Created > acc2Created) {
      return 1
    }

    if (acc1Created < acc2Created) {
      return -1
    }

    return 0
  })
}

const legacySortAccounts = (accounts: AccountJsonAny[]) => {
  // should be one 'Talisman' account with a stored seed
  const root = accounts.find(({ origin }) => origin && storedSeedAccountTypes.includes(origin))

  // can be multiple derived accounts
  // should order these by created date? probably
  const derived = accounts.filter(({ origin }) => origin === AccountTypes.DERIVED)
  const derivedSorted = sortAccountsByWhenCreated(derived)

  // can be multiple imported accounts - both JSON or SEED imports
  // as well as QR (parity signer) and HARDWARE (ledger) accounts
  // should order these by created date? probably
  const imported = accounts.filter(({ origin }) =>
    ["SEED", "JSON", "QR", "HARDWARE", "DCENT"].includes(origin as string)
  )
  const importedSorted = sortAccountsByWhenCreated(imported)

  const watchedPortfolio = accounts.filter(
    ({ origin, isPortfolio }) => origin === AccountTypes.WATCHED && isPortfolio
  )
  const watchedPortfolioSorted = sortAccountsByWhenCreated(watchedPortfolio)

  const watchedFollowed = accounts.filter(
    ({ origin, isPortfolio }) => origin === AccountTypes.WATCHED && !isPortfolio
  )
  const watchedFollowedSorted = sortAccountsByWhenCreated(watchedFollowed)

  return [
    ...(root ? [root] : []),
    ...derivedSorted,
    ...importedSorted,
    ...watchedPortfolioSorted,
    ...watchedFollowedSorted,
  ]
}

export const sortAccounts =
  (accountsCatalogStore: AccountsCatalogStore) =>
  async (keyringAccounts: SubjectInfo): Promise<AccountJsonAny[]> => {
    const unsortedAccounts = Object.values(keyringAccounts).map(
      ({ json: { address, meta }, type }): AccountJsonAny => ({
        address,
        ...meta,
        type,
      })
    )

    // default to legacy sort method when adding new accounts to the catalog
    // this will mean that for existing users, their accounts list will maintain
    // its current sort order - despite being migrated to the new catalog store
    //
    // for new users, the default catalog order will be the order in which they add
    // each new account
    const accounts = legacySortAccounts(unsortedAccounts)

    // add any newly created accounts to the catalog
    // each new account will be placed at the end of the list
    await accountsCatalogStore.addAccounts(accounts)
    await accountsCatalogStore.sortAccountsByCatalogOrder(accounts)

    return accounts
  }

export const getInjectedAccount = ({
  json: {
    address,
    meta: { genesisHash, name },
  },
  type,
}: SingleAddress): InjectedAccount => ({
  address,
  genesisHash,
  name,
  type,
})

export const filterAccountsByAddresses =
  (addresses: string[] = [], anyType = false) =>
  (accounts: SingleAddress[]) =>
    accounts
      .filter(({ json: { address } }) => !!addresses.includes(address))
      .filter(({ type }) => (anyType ? true : canDerive(type)))

export const getPublicAccounts = (
  accounts: SingleAddress[],
  filterFn: (accounts: SingleAddress[]) => SingleAddress[] = (accounts) => accounts
) =>
  filterFn(accounts)
    .filter((a) => a.json.meta.origin !== "WATCHED")
    .sort((a, b) => (a.json.meta.whenCreated || 0) - (b.json.meta.whenCreated || 0))
    .map(getInjectedAccount)

export const includeAvatar = (iconType: IdenticonType) => (account: InjectedAccount) => ({
  ...account,
  avatar: getAccountAvatarDataUri(account.address, iconType),
})

export const getPrimaryAccount = (storedSeedOnly = false) => {
  const allAccounts = keyring.getAccounts()

  if (allAccounts.length === 0) return
  const storedSeedAccount = allAccounts.find(
    ({ meta }) => meta && meta.origin && storedSeedAccountTypes.includes(meta.origin as AccountType)
  )

  if (storedSeedAccount) return storedSeedAccount
  if (storedSeedOnly) return
  return allAccounts[0]
}

export const hasQrCodeAccounts = async () => {
  const localData = await Browser.storage.local.get(null)
  return Object.entries(localData).some(
    ([key, account]: [string, Account]) =>
      key.startsWith("account:0x") && account.meta?.origin === AccountTypes.QR
  )
}

export const copySeedStoreToVerifierCertificateStore = async () => {
  const seedData = await seedPhraseStore.get()
  const verifierCertMnemonicData = await verifierCertificateMnemonicStore.get()
  if (verifierCertMnemonicData.cipher)
    throw new Error("Verifier Certificate Store already has data")
  await verifierCertificateMnemonicStore.set(seedData)
}

export const hasPrivateKey = (address: Address) => {
  const acc = keyring.getAccount(address)

  if (!acc) return false
  if (acc.meta?.isExternal) return false
  if (acc.meta?.isHardware) return false
  if (["QR", "WATCHED"].includes(acc.meta?.origin as string)) return false
  return true
}
