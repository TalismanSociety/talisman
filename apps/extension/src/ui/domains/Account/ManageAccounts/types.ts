import type { TreeAccount, TreeFolder } from "@extension/core"

export type UiTree = UiTreeItem[]
export type UiTreeItem = UiTreeAccount | UiTreeFolder
export type UiTreeAccount = TreeAccount & { id: string }
export type UiTreeFolder = Omit<TreeFolder, "tree"> & { tree: UiTreeAccount[] }

export type UiTreePosition = { parentId: string; index: number }
