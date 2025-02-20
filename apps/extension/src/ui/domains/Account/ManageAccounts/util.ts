import { log } from "extension-shared"

import { Tree, TreeAccount, TreeFolder } from "@extension/core"

import type { UiTree, UiTreeAccount, UiTreeFolder, UiTreeItem, UiTreePosition } from "./types"

// Add an id to a TreeAccount
export const accountWithId = (item: TreeAccount): UiTreeAccount => ({
  ...item,
  id: `account-${item.address}`,
  isVisible: true,
})

// Add an id to a TreeFolder's TreeAccount decendents
export const folderWithId = (item: TreeFolder): UiTreeFolder => ({
  ...item,
  tree: item.tree.map(accountWithId),
  isVisible: true,
})

// Add an id to each item in a list of TreeItems
export const dataTreeToUiTree = (items: Tree): UiTree =>
  items.map((item) => (item.type === "account" ? accountWithId(item) : folderWithId(item)))

export const getTreeItemsMap = (items: UiTreeItem[]) => {
  return items.reduce(
    (acc, item) => {
      acc[item.id] = item
      if (item.type === "folder") for (const child of item.tree) acc[child.id] = child
      return acc
    },
    {} as Record<string, UiTreeItem>,
  )
}

export const moveTreeItem = (items: UiTreeItem[], itemId: string, target: UiTreePosition) => {
  try {
    const newItems = structuredClone(items)

    // locate current parent & position
    let currentParentId = "root"
    let currentCollection: UiTreeItem[] = newItems
    let currentIndex = currentCollection.findIndex((item) => item.id === itemId)
    if (currentIndex === -1)
      for (const item of newItems.filter((item) => item.type === "folder"))
        if (item.type === "folder") {
          currentIndex = item.tree.findIndex((child) => child.id === itemId)
          if (currentIndex !== -1) {
            currentParentId = item.id as string
            currentCollection = item.tree
            break
          }
        }
    if (currentIndex === -1) throw new Error(`Item with id ${itemId} not found`)

    // Adjust index to account for the removed item
    const targetIndex =
      currentParentId === target.parentId && currentIndex < target.index
        ? target.index - 1
        : target.index

    // locate target parent
    const targetCollection =
      target.parentId === "root"
        ? newItems
        : (newItems.find((item) => item.id === target.parentId) as UiTreeFolder)?.tree
    if (!targetCollection) throw new Error(`Parent with id ${target.parentId} not found`)

    // move item
    const item = currentCollection[currentIndex]
    currentCollection.splice(currentIndex, 1)
    targetCollection.splice(targetIndex, 0, item)

    return newItems
  } catch (err) {
    log.error("Failed to move item", { err, items, itemId, target })
    return items
  }
}

export const uiTreeToDataTree = (items: UiTree): Tree => {
  return items.map((item) => {
    switch (item.type) {
      case "account": {
        return { type: "account", address: item.address }
      }
      case "folder": {
        const { id, name, tree } = item
        return {
          id,
          type: "folder",
          name,
          tree: uiTreeToDataTree(tree.filter(({ type }) => type === "account")) as TreeAccount[],
        }
      }
    }
  })
}
