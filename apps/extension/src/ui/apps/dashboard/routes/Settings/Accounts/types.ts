import type { UniqueIdentifier } from "@dnd-kit/core"
import type { TreeAccount, TreeFolder } from "@extension/core"
import type { MutableRefObject } from "react"

export type UiTree = UiTreeItem[]
export type UiTreeItem = UiTreeAccount | UiTreeFolder
export type UiTreeAccount = TreeAccount & { id: UniqueIdentifier }
export type UiTreeFolder = TreeFolder & { tree: UiTreeAccount[] }

export type FlattenedItem = UiTreeItem & {
  parentId: UniqueIdentifier | null
  depth: number
  index: number
}
export type SensorContext = MutableRefObject<{
  items: FlattenedItem[]
  offset: number
}>
