import { DEBUG } from "extension-shared"
import { v4 as uuidV4 } from "uuid"

// Defines the `Trees` structure
export type AccountsCatalogTree = "portfolio" | "watched"
export type Trees = Record<AccountsCatalogTree, Tree>
export type Tree = TreeItem[]
export type TreeItem = TreeAccount | TreeFolder
export type TreeAccount = { type: "account"; address: string }
export type TreeFolder = {
  type: "folder"
  id: string
  name: string
  tree: TreeAccount[]
}

/** Defines the available `Tree` actions */
export type RequestAccountsCatalogAction =
  // account actions
  | {
      type: "moveAccount"
      tree: AccountsCatalogTree
      address: string
      folderId?: string
      beforeItem?: MoveBeforeTarget
    }

  // folder actions
  | { type: "addFolder"; tree: AccountsCatalogTree; name: string }
  | { type: "renameFolder"; tree: AccountsCatalogTree; id: string; newName: string }
  | { type: "moveFolder"; tree: AccountsCatalogTree; id: string; beforeItem?: MoveBeforeTarget }
  | { type: "removeFolder"; tree: AccountsCatalogTree; id: string }

/**
 * The target item of a `moveAccount` or `moveFolder` action.
 * The account or folder being moved will be placed in front of this target.
 */
export type MoveBeforeTarget = { type: "account"; address: string } | { type: "folder"; id: string }

/**
 * Given some trees and some actions, this will run those actions against the trees
 */
export const runActionsOnTrees = (trees: Partial<Trees>, actions: RequestAccountsCatalogAction[]) =>
  actions.map(runActionOnTrees(trees)).some((status) => {
    // if any of the actions made a change, inform the store that a change was made
    return status === true
  })

/**
 * Given some trees and an action, will run the action against the trees
 */
export const runActionOnTrees =
  (trees: Partial<Trees>) => (action: RequestAccountsCatalogAction) => {
    const { type, tree: treeName } = action

    const tree = trees[treeName]
    if (!tree) return

    // account actions
    if (type === "moveAccount") return moveAccount(tree, action)

    // folder actions
    if (type === "addFolder") return addFolder(tree, action)
    if (type === "renameFolder") return renameFolder(tree, action)
    if (type === "moveFolder") return moveFolder(tree, action)
    if (type === "removeFolder") return removeFolder(tree, action)

    // force compilation error if any action types don't have a case
    const exhaustiveCheck: never = type
    DEBUG && console.error(`Unhandled accounts catalog action type ${exhaustiveCheck}`) // eslint-disable-line no-console
    return
  }

type MoveAccountAction = Extract<RequestAccountsCatalogAction, { type: "moveAccount" }>
const moveAccount = (tree: Tree, { address, folderId, beforeItem }: MoveAccountAction) => {
  // remove existing account from tree
  const accountItem = removeAccountFromTree(tree, address)
  if (!accountItem) return

  // find destination set (either root tree, or folder tree)
  const folderSet = folderId
    ? tree.filter(folderFilter).find((item) => item.id === folderId)?.tree
    : undefined
  const set = folderSet ?? tree

  // insert account into tree
  const beforeItemIndex = beforeItem ? findBeforeItemIndex(set, beforeItem) : -1
  if (beforeItem && beforeItemIndex !== -1) {
    // insert before specified item
    set.splice(beforeItemIndex, 0, accountItem)
  } else {
    // insert at end
    set.push(accountItem)
  }

  // inform the store that a change was made
  return true
}

type AddFolderAction = Extract<RequestAccountsCatalogAction, { type: "addFolder" }>
const addFolder = (tree: Tree, { name }: AddFolderAction) => {
  // generate random id
  const id = uuidV4()

  // insert folder into tree
  tree.push({
    type: "folder",
    id,
    name: name.trim(),
    tree: [],
  })

  // inform the store that a change was made
  return true
}

type RenameFolderAction = Extract<RequestAccountsCatalogAction, { type: "renameFolder" }>
const renameFolder = (tree: Tree, { id, newName }: RenameFolderAction) => {
  // find folder in tree
  const folder = tree.filter(folderFilter).find((item) => item.id === id)
  if (!folder) return

  // remove any leading/trailing whitespace in the folder name
  folder.name = newName.trim()

  // inform the store that a change was made
  return true
}

type MoveFolderAction = Extract<RequestAccountsCatalogAction, { type: "moveFolder" }>
const moveFolder = (tree: Tree, { id, beforeItem }: MoveFolderAction) => {
  // find existing folder in tree
  const folderIndex = tree.findIndex((item) => item.type === "folder" && item.id === id)
  if (folderIndex === -1) return

  // remove existing folder from tree
  const folder = tree.splice(folderIndex, 1)[0]

  // insert folder into tree
  const beforeItemIndex = beforeItem ? findBeforeItemIndex(tree, beforeItem) : -1
  if (beforeItem && beforeItemIndex !== -1) {
    // insert before specified item
    tree.splice(beforeItemIndex, 0, folder)
  } else {
    // insert at end
    tree.push(folder)
  }

  // inform the store that a change was made
  return true
}

type RemoveFolderAction = Extract<RequestAccountsCatalogAction, { type: "removeFolder" }>
const removeFolder = (tree: Tree, { id }: RemoveFolderAction) => {
  // find existing folder in tree
  const folderIndex = tree.findIndex((item) => item.type === "folder" && item.id === id)
  if (folderIndex === -1) return

  // remove existing folder from tree
  const folder = tree.splice(folderIndex, 1)[0]
  if (folder.type !== "folder") return

  // insert folder accounts back into tree
  folder.tree.forEach((account) => addAccount(tree, account.address))

  // inform the store that a change was made
  return true
}

/** Filters an array of `TreeItem` (accounts and folders) into an array of just `TreeAccount` */
export const accountFilter = (item: TreeItem): item is TreeAccount => item.type === "account"

/** Filters an array of `TreeItem` (accounts and folders) into an array of just `TreeFolder` */
export const folderFilter = (item: TreeItem): item is TreeFolder => item.type === "folder"

/** Given a tree and a `MoveBeforeTarget`, finds the index of the target in the tree */
const findBeforeItemIndex = (tree: Tree, beforeItem: MoveBeforeTarget) => {
  const findBeforeItem =
    beforeItem.type === "account"
      ? (item: TreeItem) => item.type === beforeItem.type && item.address === beforeItem.address
      : (item: TreeItem) => item.type === beforeItem.type && item.id === beforeItem.id
  return tree.findIndex(findBeforeItem)
}

/** Recursive, removes an account from anywhere in the tree, including inside folders */
const removeAccountFromTree = (tree: Tree, address: string): TreeAccount | undefined => {
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

/** Sorts a list of items which have a `sortOrder` property */
export const bySortOrder = <T extends { sortOrder?: number }>(a: T, b: T) =>
  (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER)

/** Adds an account (by address) to a tree */
export const addAccount = (tree: Tree, address: string) => {
  // don't add account if it already exists
  const accountIsInTree = !!tree.find((item) =>
    item.type === "account"
      ? item.address === address
      : item.tree.find((account) => account.address === address)
  )
  if (accountIsInTree) return

  // insert account into tree
  tree.push({ type: "account", address })

  // inform the store that a change was made
  return true
}

/** Removes an account (by address) from a tree */
export const removeAccount = (tree: Tree, address: string) => {
  if (removeAccountFromTree(tree, address) === undefined) return

  // inform the store that a change was made
  return true
}
