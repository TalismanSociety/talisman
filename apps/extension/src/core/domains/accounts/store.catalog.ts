import { DEBUG } from "@core/constants"
import {
  AccountJsonAny,
  AccountsCatalogTree,
  RequestAccountsCatalogMutate,
} from "@core/domains/accounts/types"
import { SubscribableStorageProvider } from "@core/libs/Store"

// AccountsCatalogData is here in case we want to use this to store anything
// else in addition to the two `Tree` objects in the future
export type AccountsCatalogData = Trees

export const emptyCatalog: AccountsCatalogData = { portfolio: [], watched: [] }

export type Trees = Record<AccountsCatalogTree, Tree>
export type Tree = TreeItem[]
export type TreeItem = TreeAccount | TreeFolder
export type TreeAccount = { type: "account"; address: string; hidden: boolean }
// TODO: Make TreeFolder hideable
export type TreeFolder = { type: "folder"; name: string; color: string; tree: TreeAccount[] }

export type MoveBeforeTarget =
  | { type: "account"; address: string }
  | { type: "folder"; name: string }

// const accountFilter = (item: TreeItem): item is TreeAccount => item.type === "account"
const folderFilter = (item: TreeItem): item is TreeFolder => item.type === "folder"
const defaultFolderColor = "#d5ff5c"

/**
 * This status is returned from any mutation made against a tree inside this store.
 *
 * The store uses this status to determine whether or not the mutation actually
 * made any changes to the underlying data.
 *
 * If no data is changed, the store knows not to call `this.set()` with the mutation result.
 */
type MutatedStatus = { Mutated: boolean }
const Mutated: MutatedStatus = { Mutated: true }
const NotMutated: MutatedStatus = { Mutated: false }
const isMutated = ({ Mutated: M }: MutatedStatus) => M === Mutated.Mutated
const someIsMutated = (statuses: MutatedStatus[]) =>
  statuses.some((status) => isMutated(status)) ? Mutated : NotMutated

export class AccountsCatalogStore extends SubscribableStorageProvider<
  AccountsCatalogData,
  "pri(mnemonic.subscribe)"
> {
  //
  // public interface
  //

  sortAccounts = async (accounts: AccountJsonAny[]) => {
    const sortedAccounts = accounts.slice()
    let nextSortIndex = 0

    await this.withTrees((trees) => {
      ;[...trees.portfolio, ...trees.watched].forEach((item) => {
        if (item.type === "account") {
          const account = sortedAccounts.find((account) => account.address === item.address)
          if (!account) return

          account.folder = undefined
          account.hidden = item.hidden
          account.sortOrder = nextSortIndex++
        }
        if (item.type === "folder") {
          item.tree.forEach((folderItem) => {
            const account = sortedAccounts.find((account) => account.address === folderItem.address)
            if (!account) return

            account.folder = item.name
            account.hidden = folderItem.hidden
            account.sortOrder = nextSortIndex++
          })
        }
      })
      return NotMutated
    })

    return sortedAccounts.sort(
      (a, b) => (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER)
    )
  }

  executeCatalogMutations = async (mutations: RequestAccountsCatalogMutate[]) =>
    await this.withTrees((trees) => AccountsCatalogStore.executeMutationsOnTrees(trees, mutations))

  static executeMutationsOnTrees = (
    trees: Partial<Trees>,
    mutations: RequestAccountsCatalogMutate[]
  ): MutatedStatus =>
    someIsMutated(
      mutations.map((mutation) => AccountsCatalogStore.executeMutationOnTrees(trees, mutation))
    )
  static executeMutationOnTrees = (
    trees: Partial<Trees>,
    mutation: RequestAccountsCatalogMutate
  ): MutatedStatus => {
    const { type } = mutation

    const tree = AccountsCatalogStore.getTree(trees, mutation.tree)
    if (!tree) return NotMutated

    // account mutations
    if (type === "moveAccount")
      return AccountsCatalogStore.moveAccount(
        tree,
        mutation.address,
        mutation.folder,
        mutation.beforeItem
      )
    if (type === "hideAccount")
      return AccountsCatalogStore.hideAccount(tree, mutation.address, true)
    if (type === "showAccount")
      return AccountsCatalogStore.hideAccount(tree, mutation.address, false)

    // folder mutations
    if (type === "addFolder")
      return AccountsCatalogStore.addFolder(tree, mutation.name, mutation.color)
    if (type === "renameFolder")
      return AccountsCatalogStore.renameFolder(tree, mutation.name, mutation.newName)
    if (type === "recolorFolder")
      return AccountsCatalogStore.recolorFolder(tree, mutation.name, mutation.newColor)
    if (type === "moveFolder")
      return AccountsCatalogStore.moveFolder(tree, mutation.name, mutation.beforeItem)
    if (type === "removeFolder") return AccountsCatalogStore.removeFolder(tree, mutation.name)

    // force compilation error if any mutation types don't have a case
    const exhaustiveCheck: never = type
    DEBUG && console.error(`Unhandled accounts catalog mutation type ${exhaustiveCheck}`) // eslint-disable-line no-console
    return NotMutated
  }

  addAccounts = async (accounts: Array<{ address: string; isPortfolio?: boolean }>) =>
    await this.withTrees((trees) =>
      someIsMutated(
        accounts.map(({ address, isPortfolio }) => {
          let addStatus = NotMutated
          let removeStatus = NotMutated

          if (isPortfolio !== false) {
            addStatus = AccountsCatalogStore.addAccount(trees.portfolio, address)
            removeStatus = AccountsCatalogStore.removeAccount(trees.watched, address)
          } else {
            addStatus = AccountsCatalogStore.addAccount(trees.watched, address)
            removeStatus = AccountsCatalogStore.removeAccount(trees.portfolio, address)
          }

          if (isMutated(addStatus)) return Mutated
          if (isMutated(removeStatus)) return Mutated
          return NotMutated
        })
      )
    )
  removeAccounts = async (addresses: string[]) =>
    await this.withTrees((trees) =>
      someIsMutated(
        addresses.map((address) => {
          const portfolioStatus = AccountsCatalogStore.removeAccount(trees.portfolio, address)
          const watchedStatus = AccountsCatalogStore.removeAccount(trees.watched, address)

          if (isMutated(portfolioStatus)) return Mutated
          if (isMutated(watchedStatus)) return Mutated
          return NotMutated
        })
      )
    )

  //
  // private implementation
  //

  private withTrees = async (callback: (trees: Trees) => MutatedStatus) => {
    const store = await this.get()

    const ensureArray = <T>(item: T) => (Array.isArray(item) ? item : [])
    const trees: Trees = {
      portfolio: ensureArray(store.portfolio),
      watched: ensureArray(store.watched),
    }

    const status = callback(trees)

    if (isMutated(status)) await this.set(trees)
  }

  private static getTree = (
    trees: Partial<Trees>,
    treeName: AccountsCatalogTree = "portfolio"
  ): Tree | undefined => trees[treeName]

  private static addAccount = (tree: Tree, address: string): MutatedStatus => {
    // don't add account if it already exists
    if (AccountsCatalogStore.accountInTree(tree, address)) return NotMutated

    // insert account into tree
    tree.push({ type: "account", address, hidden: false })

    return Mutated
  }
  private static moveAccount = (
    tree: Tree,
    address: string,
    folder?: string,
    beforeItem?: MoveBeforeTarget
  ): MutatedStatus => {
    // remove existing account from tree
    const accountItem = AccountsCatalogStore.removeAccountFromTree(tree, address)
    if (!accountItem) return NotMutated

    // find destination set (either root tree, or folder tree)
    const folderSet = folder
      ? tree.filter(folderFilter).find((item) => item.name === folder)?.tree
      : undefined
    const set = folderSet ?? tree

    // insert account into tree
    const beforeItemIndex = beforeItem ? AccountsCatalogStore.findBeforeItem(set, beforeItem) : -1
    if (beforeItem && beforeItemIndex !== -1) {
      // insert before specified item
      set.splice(beforeItemIndex, 0, accountItem)
    } else {
      // insert at end
      set.push(accountItem)
    }
    return Mutated
  }
  private static hideAccount = (tree: Tree, address: string, hidden: boolean): MutatedStatus => {
    const account = AccountsCatalogStore.findAccountInTree(tree, address)
    if (account?.type !== "account") return NotMutated
    if (account.hidden === hidden) return NotMutated

    account.hidden = hidden

    return Mutated
  }
  private static removeAccount = (tree: Tree, address: string): MutatedStatus =>
    AccountsCatalogStore.removeAccountFromTree(tree, address) === undefined ? NotMutated : Mutated

  private static addFolder = (tree: Tree, name: string, color?: string): MutatedStatus => {
    // don't add folder if it already exists
    if (AccountsCatalogStore.folderInTree(tree, name)) return NotMutated

    // insert folder into tree
    tree.push({ type: "folder", name, color: color ?? defaultFolderColor, tree: [] })

    return Mutated
  }
  private static renameFolder = (tree: Tree, name: string, newName: string): MutatedStatus => {
    // don't rename folder if newName already exists
    if (AccountsCatalogStore.folderInTree(tree, newName)) return NotMutated

    const folder = tree.filter(folderFilter).find((item) => item.name === name)
    if (!folder) return NotMutated

    folder.name = newName

    return Mutated
  }
  private static recolorFolder = (tree: Tree, name: string, newColor?: string): MutatedStatus => {
    const folder = tree.filter(folderFilter).find((item) => item.name === name)
    if (!folder) return NotMutated

    folder.color = newColor ?? defaultFolderColor

    return Mutated
  }
  private static moveFolder = (
    tree: Tree,
    name: string,
    beforeItem?: MoveBeforeTarget
  ): MutatedStatus => {
    // find existing folder in tree
    const folderIndex = tree.findIndex((item) => item.type === "folder" && item.name === name)
    if (folderIndex === -1) return NotMutated

    // remove existing folder from tree
    const folder = tree.splice(folderIndex, 1)[0]

    // insert folder into tree
    const beforeItemIndex = beforeItem ? AccountsCatalogStore.findBeforeItem(tree, beforeItem) : -1
    if (beforeItem && beforeItemIndex !== -1) {
      // insert before specified item
      tree.splice(beforeItemIndex, 0, folder)
    } else {
      // insert at end
      tree.push(folder)
    }

    return Mutated
  }
  private static removeFolder = (tree: Tree, name: string): MutatedStatus => {
    // find existing folder in tree
    const folderIndex = tree.findIndex((item) => item.type === "folder" && item.name === name)
    if (folderIndex === -1) return NotMutated

    // remove existing folder from tree
    const folder = tree.splice(folderIndex, 1)[0]
    if (folder.type !== "folder") return NotMutated

    // insert folder accounts back into tree
    folder.tree.forEach((account) => AccountsCatalogStore.addAccount(tree, account.address))

    return Mutated
  }

  private static findAccountInTree = (tree: Tree, address: string) =>
    tree.find((item) =>
      item.type === "account"
        ? item.address === address
        : item.tree.find((account) => account.address === address)
    )
  private static accountInTree = (tree: Tree, address: string): boolean =>
    AccountsCatalogStore.findAccountInTree(tree, address) !== undefined
  private static folderInTree = (tree: Tree, name: string): boolean =>
    tree.find((item) => item.type === "folder" && item.name === name) !== undefined

  private static findBeforeItem = (tree: Tree, beforeItem: MoveBeforeTarget) => {
    const findBeforeItem =
      beforeItem.type === "account"
        ? (item: TreeItem) => item.type === beforeItem.type && item.address === beforeItem.address
        : (item: TreeItem) => item.type === beforeItem.type && item.name === beforeItem.name
    return tree.findIndex(findBeforeItem)
  }

  private static removeAccountFromTree = (tree: Tree, address: string): TreeAccount | undefined => {
    let account = undefined
    const removeFromSet = (set: TreeItem[], address: string) => {
      const indexes = set.reduceRight((indexes, item, index) => {
        if (item.type === "account" && item.address === address) {
          account = item
          indexes.push(index)
        }
        if (item.type === "folder") removeFromSet(item.tree, address)
        return indexes
      }, [] as number[])
      indexes.forEach((index) => set.splice(index, 1))
    }

    removeFromSet(tree, address)

    return account
  }
}

export const accountsCatalogStore = new AccountsCatalogStore("accountsCatalog")
