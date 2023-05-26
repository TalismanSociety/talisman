import {
  AccountJsonAny,
  AccountType,
  AccountTypes,
  IdenticonType,
  storedSeedAccountTypes,
} from "@core/domains/accounts/types"
import { getAccountAvatarDataUri } from "@core/util/getAccountAvatarDataUri"
import { canDerive } from "@polkadot/extension-base/utils"
import type { InjectedAccount } from "@polkadot/extension-inject/types"
import keyring from "@polkadot/ui-keyring"
import type { SingleAddress, SubjectInfo } from "@polkadot/ui-keyring/observable/types"

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

export const sortAccounts = (accounts: SubjectInfo): AccountJsonAny[] => {
  const transformedAccounts = Object.values(accounts).map(
    ({ json: { address, meta }, type }: SingleAddress): AccountJsonAny => ({
      address,
      ...meta,
      type,
    })
  )

  let ordered: AccountJsonAny[] = []

  // should be one 'Talisman' account with a stored seed
  const root = transformedAccounts.find(
    ({ origin }) => origin && storedSeedAccountTypes.includes(origin)
  )
  !!root && ordered.push(root)

  // can be multiple derived accounts
  // should order these by created date? probably
  const derived = transformedAccounts.filter(({ origin }) => origin === AccountTypes.DERIVED)
  const derivedSorted = sortAccountsByWhenCreated(derived)
  ordered = [...ordered, ...derivedSorted]

  // can be multiple imported accounts - both JSON or SEED imports
  // as well as QR (parity signer) and HARDWARE (ledger) accounts
  // should order these by created date? probably
  const imported = transformedAccounts.filter(({ origin }) =>
    ["SEED", "JSON", "QR", "HARDWARE"].includes(origin as string)
  )
  const importedSorted = sortAccountsByWhenCreated(imported)
  ordered = [...ordered, ...importedSorted]

  return ordered
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
