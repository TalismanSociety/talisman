import type { AccountJsonAny } from "core/types"
import type { SubjectInfo } from "@polkadot/ui-keyring/observable/types"
import type { InjectedAccount } from "@polkadot/extension-inject/types"
import { canDerive } from "@polkadot/extension-base/utils"

export const AccountTypes = {
  ROOT: "ROOT",
  DERIVED: "DERIVED",
  HARDWARE: "HARDWARE",
  SEED: "SEED",
  JSON: "JSON",
}

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

export const filterPublicAccounts = (accounts: SubjectInfo): AccountJsonAny[] => {
  const transformedAccounts = Object.values(accounts).map(
    ({ json: { address, meta }, type }: any): AccountJsonAny => ({
      address,
      ...meta,
      type,
    })
  )

  let ordered: AccountJsonAny[] = []

  // should be one root account
  const root = transformedAccounts.find(({ origin }) => origin === "ROOT")
  !!root && ordered.push(root)

  // can be multiple derived accounts
  // should order these by created date? probably
  const derived = transformedAccounts.filter(({ origin }) => origin === "DERIVED")
  const derivedSorted = sortAccountsByWhenCreated(derived)
  ordered = [...ordered, ...derivedSorted]

  // can be multiple imported accounts - both JSON or SEED imports
  // should order these by created date? probably
  const imported = transformedAccounts.filter(({ origin }) =>
    ["SEED", "JSON", "HARDWARE"].includes(origin as string)
  )
  const importedSorted = sortAccountsByWhenCreated(imported)
  ordered = [...ordered, ...importedSorted]

  return ordered
}

export const filterAccountsByAddresses = (
  accounts: SubjectInfo,
  addresses: string[] = [],
  anyType = false
): InjectedAccount[] => {
  return Object.values(accounts)
    .filter(({ json: { address } }) => !!addresses.includes(address))
    .filter(({ type }) => (anyType ? true : canDerive(type)))
    .sort((a, b) => (a.json.meta.whenCreated || 0) - (b.json.meta.whenCreated || 0))
    .map(
      ({
        json: {
          address,
          meta: { genesisHash, name },
        },
        type,
      }): InjectedAccount => ({
        address,
        genesisHash,
        name,
        type,
      })
    )
}
