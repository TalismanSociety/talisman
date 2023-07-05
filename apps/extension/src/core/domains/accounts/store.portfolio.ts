import { DEBUG } from "@core/constants"
import { AccountJsonAny, RequestPortfolioMutate } from "@core/domains/accounts/types"
import { SubscribableStorageProvider } from "@core/libs/Store"

export type PortfolioData = {
  tree: Tree
}

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

// TODO: Split portfolio and watch-only accounts into separate trees
export class PortfolioStore extends SubscribableStorageProvider<
  PortfolioData,
  "pri(mnemonic.subscribe)"
> {
  //
  // public interface
  //

  sortAccounts = async (accounts: AccountJsonAny[]) => {
    const sortedAccounts = accounts.slice()
    let nextSortIndex = 0

    await this.withTree((tree) => {
      tree.forEach((item) => {
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
    })

    return sortedAccounts.sort(
      (a, b) => (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER)
    )
  }

  executePortfolioMutations = async (mutations: RequestPortfolioMutate[]) =>
    await this.withTree((tree) => PortfolioStore.mutateTree(tree, mutations))

  static mutateTree = (tree: Tree, mutations: RequestPortfolioMutate[]) =>
    mutations.forEach((mutation) => {
      const { type } = mutation

      // account mutations
      if (type === "moveAccount")
        return PortfolioStore.moveAccount(
          tree,
          mutation.address,
          mutation.folder,
          mutation.beforeItem
        )
      if (type === "hideAccount") return PortfolioStore.hideAccount(tree, mutation.address, true)
      if (type === "showAccount") return PortfolioStore.hideAccount(tree, mutation.address, false)

      // folder mutations
      if (type === "addFolder") return PortfolioStore.addFolder(tree, mutation.name, mutation.color)
      if (type === "renameFolder")
        return PortfolioStore.renameFolder(tree, mutation.name, mutation.newName)
      if (type === "recolorFolder")
        return PortfolioStore.recolorFolder(tree, mutation.name, mutation.newColor)
      if (type === "moveFolder")
        return PortfolioStore.moveFolder(tree, mutation.name, mutation.beforeItem)
      if (type === "removeFolder") return PortfolioStore.removeFolder(tree, mutation.name)

      // force compilation error if any mutation types don't have a case
      const exhaustiveCheck: never = type
      DEBUG && console.error(`Unhandled portfolio mutation type ${exhaustiveCheck}`) // eslint-disable-line no-console
    })

  addAccounts = async (addresses: string[]) =>
    await this.withTree((tree) =>
      addresses.forEach((address) => PortfolioStore.addAccount(tree, address))
    )
  removeAccounts = async (addresses: string[]) =>
    await this.withTree((tree) =>
      addresses.forEach((address) => PortfolioStore.removeAccount(tree, address))
    )

  //
  // private implementation
  //

  private withTree = async (callback: (tree: Tree) => void) => {
    const store = await this.get()
    const tree = Array.isArray(store.tree) ? store.tree : []
    callback(tree)
    await this.set({ tree })
  }

  private static addAccount = (tree: Tree, address: string) => {
    // don't add account if it already exists
    if (PortfolioStore.accountInTree(tree, address)) return

    // insert account into tree
    tree.push({ type: "account", address, hidden: false })
  }
  private static moveAccount = (
    tree: Tree,
    address: string,
    folder?: string,
    beforeItem?: MoveBeforeTarget
  ) => {
    // remove existing account from tree
    const accountItem = PortfolioStore.removeAccountFromTree(tree, address)
    if (!accountItem) return

    // find destination set (either root tree, or folder tree)
    const folderSet = folder
      ? tree.filter(folderFilter).find((item) => item.name === folder)?.tree
      : undefined
    const set = folderSet ?? tree

    // insert account into tree
    const beforeItemIndex = beforeItem ? PortfolioStore.findBeforeItem(set, beforeItem) : -1
    if (beforeItem && beforeItemIndex !== -1) {
      // insert before specified item
      set.splice(beforeItemIndex, 0, accountItem)
    } else {
      // insert at end
      set.push(accountItem)
    }
  }
  private static hideAccount = (tree: Tree, address: string, hidden: boolean) => {
    const account = PortfolioStore.findAccountInTree(tree, address)
    if (account?.type !== "account") return
    account.hidden = hidden
  }
  private static removeAccount = (tree: Tree, address: string) =>
    PortfolioStore.removeAccountFromTree(tree, address)

  private static addFolder = (tree: Tree, name: string, color?: string) => {
    // don't add folder if it already exists
    if (PortfolioStore.folderInTree(tree, name)) return

    // insert folder into tree
    tree.push({ type: "folder", name, color: color ?? defaultFolderColor, tree: [] })
  }
  private static renameFolder = (tree: Tree, name: string, newName: string) => {
    // don't rename folder if newName already exists
    if (PortfolioStore.folderInTree(tree, newName)) return

    const folder = tree.filter(folderFilter).find((item) => item.name === name)
    if (!folder) return

    folder.name = newName
  }
  private static recolorFolder = (tree: Tree, name: string, newColor?: string) => {
    const folder = tree.filter(folderFilter).find((item) => item.name === name)
    if (!folder) return

    folder.color = newColor ?? defaultFolderColor
  }
  private static moveFolder = (tree: Tree, name: string, beforeItem?: MoveBeforeTarget) => {
    // find existing folder in tree
    const folderIndex = tree.findIndex((item) => item.type === "folder" && item.name === name)
    if (folderIndex === -1) return

    // remove existing folder from tree
    const folder = tree.splice(folderIndex, 1)[0]

    // insert folder into tree
    const beforeItemIndex = beforeItem ? PortfolioStore.findBeforeItem(tree, beforeItem) : -1
    if (beforeItem && beforeItemIndex !== -1) {
      // insert before specified item
      tree.splice(beforeItemIndex, 0, folder)
    } else {
      // insert at end
      tree.push(folder)
    }
  }
  private static removeFolder = (tree: Tree, name: string) => {
    // find existing folder in tree
    const folderIndex = tree.findIndex((item) => item.type === "folder" && item.name === name)
    if (folderIndex === -1) return

    // remove existing folder from tree
    const folder = tree.splice(folderIndex, 1)[0]
    if (folder.type !== "folder") return

    // insert folder accounts back into tree
    folder.tree.forEach((account) => PortfolioStore.addAccount(tree, account.address))
  }

  private static findAccountInTree = (tree: Tree, address: string) =>
    tree.find((item) =>
      item.type === "account"
        ? item.address === address
        : item.tree.find((account) => account.address === address)
    )
  private static accountInTree = (tree: Tree, address: string): boolean =>
    PortfolioStore.findAccountInTree(tree, address) !== undefined
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

export const portfolioStore = new PortfolioStore("portfolio")
