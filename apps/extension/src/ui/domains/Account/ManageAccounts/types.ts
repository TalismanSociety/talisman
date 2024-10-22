import type { TreeAccount, TreeFolder } from "@extension/core"

export type UiTree = UiTreeItem[]
export type UiTreeItem = UiTreeAccount | UiTreeFolder
export type UiTreeAccount = TreeAccount & UiTreeItemVisibility & { id: string }
export type UiTreeFolder = Omit<TreeFolder, "tree"> &
  UiTreeItemVisibility & {
    tree: UiTreeAccount[]
  }

export type UiTreePosition = { parentId: string; index: number }
type UiTreeItemVisibility = { isVisible: boolean }
