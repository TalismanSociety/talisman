import type { TreeAccount, TreeFolder } from "@core/domains/accounts/store.portfolio"
import type { UniqueIdentifier } from "@dnd-kit/core"
import type { MutableRefObject } from "react"

export type UiTree = UiTreeItem[]
export type UiTreeItem = UiTreeAccount | UiTreeFolder
export type UiTreeAccount = TreeAccount & { id: UniqueIdentifier }
export type UiTreeFolder = TreeFolder & { id: UniqueIdentifier; tree: UiTreeAccount[] }

export type FlattenedItem = UiTreeItem & {
  parentId: UniqueIdentifier | null
  depth: number
  index: number
}
export type SensorContext = MutableRefObject<{
  items: FlattenedItem[]
  offset: number
}>
