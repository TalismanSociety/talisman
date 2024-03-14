import { StorageProvider } from "../../libs/Store"
import {
  RequestAccountsCatalogAction,
  Trees,
  addAccount,
  bySortOrder,
  removeAccount,
  runActionsOnTrees,
} from "./helpers.catalog"
import { AccountJsonAny } from "./types"

// AccountsCatalogData is here in case we want to use this to store anything
// else in addition to the two `Tree` objects in the future
export type AccountsCatalogData = Trees

export class AccountsCatalogStore extends StorageProvider<AccountsCatalogData> {
  /**
   * This method will modify the store when given some actions to run.
   */
  runActions = async (actions: RequestAccountsCatalogAction[]) =>
    await this.withTrees((trees) => runActionsOnTrees(trees, actions))

  /**
   * This method will sort a given array of accounts into the order that they have in the store.
   *
   * It will also set the `sortOrder` field on each account.
   *
   * It will also set the `folderId` and `folderName` fields on each account which is in a folder.
   */
  sortAccountsByCatalogOrder = async (accounts: AccountJsonAny[]) => {
    const accountsByAddress = new Map(accounts.map((account) => [account.address, account]))

    let nextSortIndex = 0
    await this.withTrees((trees) => {
      ;[...trees.portfolio, ...trees.watched].forEach((item) => {
        if (item.type === "account") {
          const account = accountsByAddress.get(item.address)
          if (!account) return

          account.folderId = undefined
          account.folderName = undefined
          account.sortOrder = nextSortIndex++
        }

        if (item.type === "folder")
          item.tree.forEach((folderItem) => {
            const account = accountsByAddress.get(folderItem.address)
            if (!account) return

            account.folderId = item.id
            account.folderName = item.name
            account.sortOrder = nextSortIndex++
          })
      })
    })

    return accounts.sort(bySortOrder)
  }

  /**
   * This method should be called with the full list of keyring accounts each time the keyring is changed.
   *
   * This will ensure that the catalog and the keyring stay in sync.
   *
   * If all of the given accounts are already in the catalog, this method will noop.
   */
  addAccounts = async (accounts: Array<{ address: string; isPortfolio?: boolean }>) =>
    await this.withTrees((trees) =>
      accounts
        .map(({ address, isPortfolio }) => {
          const addTree = isPortfolio !== false ? trees.portfolio : trees.watched
          const rmTree = isPortfolio !== false ? trees.watched : trees.portfolio

          const added = addAccount(addTree, address)
          const removed = removeAccount(rmTree, address)

          return added || removed
        })
        .some((status) => {
          // if any accounts were added or removed, inform the store that a change was made
          return status === true
        })
    )

  /**
   * This method should be called with any deleted addresses each time an account is removed from the keyring.
   *
   * This will ensure that the catalog and the keyring stay in sync.
   */
  removeAccounts = async (addresses: string[]) =>
    await this.withTrees((trees) =>
      addresses
        .map((address) => {
          const portfolioRemoved = removeAccount(trees.portfolio, address)
          const watchedRemoved = removeAccount(trees.watched, address)

          return portfolioRemoved || watchedRemoved
        })
        .some((status) => {
          // if any accounts were removed, inform the store that a change was made
          return status === true
        })
    )

  /**
   * A helper method on this store.
   *
   * Intended usage:
   * 1. Call this to get a reference to the store's data inside the callback
   * 2. Read or change the data as much as you like inside the callback
   * 3. Return `true` from the callback if the data was changed, otherwise return `false`
   *
   * By using this helper, the data will always be a valid `Trees` type,
   * even when the underlying localStorage has never been initialized.
   */
  private withTrees = async (callback: (trees: Trees) => boolean | void) => {
    // get the data from localStorage
    const store = await this.get()

    // make sure it is of type `Trees`, and coerce it if not
    const ensureArray = <T>(item: T) => (Array.isArray(item) ? item : [])
    const trees: Trees = {
      portfolio: ensureArray(store.portfolio),
      watched: ensureArray(store.watched),
    }

    // run the callback against the data
    const status = callback(trees)

    // update localStorage, but only if the callback returned `true`
    if (status === true) await this.set(trees)
  }
}

export const emptyCatalog: AccountsCatalogData = { portfolio: [], watched: [] }
export const accountsCatalogStore = new AccountsCatalogStore("accountsCatalog")
