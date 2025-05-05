import { isAddressEqual } from "@talismn/crypto"
import { Account, isAccountNotContact, isAccountPortfolio } from "@talismn/keyring"

import { StorageProvider } from "../../libs/Store"
import {
  addAccount,
  recGetAllAddresses,
  removeAccount,
  RequestAccountsCatalogAction,
  runActionsOnTrees,
  Trees,
} from "./helpers.catalog"

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
   */
  sortAccountsByCatalogOrder = async (accounts: Account[]) => {
    let orderedAddresses: string[] = []

    await this.withTrees((trees) => {
      orderedAddresses = [...trees.portfolio, ...trees.watched].reduce<string[]>((prev, curr) => {
        if (curr.type === "account") prev.push(curr.address)
        if (curr.type === "folder") curr.tree.forEach((item) => prev.push(item.address))
        return prev
      }, [])
    })

    return accounts.sort((a, b) => {
      const aIndex = orderedAddresses.indexOf(a.address)
      const bIndex = orderedAddresses.indexOf(b.address)
      if (aIndex === -1 && bIndex === -1) return (a.createdAt ?? 0) - (b.createdAt ?? 0)
      if (aIndex === -1) return 1
      if (bIndex === -1) return -1
      return aIndex - bIndex
    })
  }

  /**
   * This method should be called with the full list of keyring accounts each time the keyring is changed.
   *
   * This will ensure that the catalog and the keyring stay in sync.
   *
   * If all of the given accounts are already in the catalog, this method will noop.
   */
  syncAccounts = async (accounts: Account[]) =>
    await this.withTrees((trees) => {
      const validAccounts = accounts.filter(isAccountNotContact)

      // add missing accounts
      const hasAdded = validAccounts
        .map((account) => {
          const [addTree, rmTree] = isAccountPortfolio(account)
            ? [trees.portfolio, trees.watched]
            : [trees.watched, trees.portfolio]

          const added = addAccount(addTree, account.address)
          const removed = removeAccount(rmTree, account.address)

          return added || removed
        })
        .some((status) => {
          // if any accounts were added or removed, inform the store that a change was made
          return status === true
        })

      // remove items that dont match any account
      const validAddresses = validAccounts.map((a) => a.address)
      const hasRemoved = [trees.portfolio, trees.watched]
        .map((tree) => {
          const treeAddresses = recGetAllAddresses(tree)
          const removeAddresses = treeAddresses.filter(
            (ta) => !validAddresses.some((va) => isAddressEqual(ta, va)),
          )
          if (!removeAddresses.length) return false

          removeAddresses.forEach((a) => removeAccount(tree, a))
          return true
        })
        .some((hasRemoved) => hasRemoved)

      return hasAdded || hasRemoved
    })

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
      watched: ensureArray(store.watched).filter(isAccountNotContact),
    }

    // run the callback against the data
    const status = callback(trees)

    // update localStorage, but only if the callback returned `true`
    if (status === true) await this.set(trees)
  }
}

export const emptyCatalog: AccountsCatalogData = { portfolio: [], watched: [] }
export const accountsCatalogStore = new AccountsCatalogStore("accountsCatalog")
