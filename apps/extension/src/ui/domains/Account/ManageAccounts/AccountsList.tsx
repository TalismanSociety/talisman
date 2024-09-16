import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { useCallback, useEffect, useMemo, useState } from "react"

import { AccountJsonAny, AccountsCatalogTree } from "@extension/core"
import { api } from "@ui/api"

import type { UiTree, UiTreePosition } from "./types"
import { TreeItem, TreeItems } from "./TreeItems"
import { getTreeItemsMap, moveTreeItem, uiTreeToDataTree } from "./util"

type Props = {
  accounts: AccountJsonAny[]
  balanceTotalPerAccount: Record<string, number>
  treeName: AccountsCatalogTree
  tree: UiTree
}

export const AccountsList = ({ accounts, balanceTotalPerAccount, treeName, tree }: Props) => {
  const [items, setItems] = useState(() => tree ?? [])
  useEffect(() => {
    setItems(tree ?? [])
  }, [tree])

  const itemsMap = useMemo(() => getTreeItemsMap(items), [items])

  const [draggedItemId, setDraggedItemId] = useState<string | null>(null)

  const draggedItem = useMemo(
    () => (draggedItemId ? itemsMap[draggedItemId] : null),
    [draggedItemId, itemsMap]
  )

  const isDraggingFolder = useMemo(() => draggedItem?.type === "folder", [draggedItem?.type])

  const sensors = useSensors(useSensor(PointerSensor))

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setDraggedItemId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      if (active.id && over?.data.current) {
        setItems((items) => {
          // reorder
          const newItems = moveTreeItem(
            items,
            active.id as string,
            over.data.current as UiTreePosition
          )
          // asynchronously update backend
          api.accountsCatalogRunActions([
            { type: "reorder", tree: treeName, items: uiTreeToDataTree(newItems) },
          ])
          return newItems
        })
      }

      return setDraggedItemId(null)
    },
    [treeName]
  )

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <TreeItems
        treeName={treeName}
        parentId="root"
        items={items}
        disableFolderDrop={isDraggingFolder}
        accounts={accounts}
        balanceTotalPerAccount={balanceTotalPerAccount}
      />
      <DragOverlay>
        {draggedItem ? (
          <TreeItem
            treeName={treeName}
            item={draggedItem}
            isDragged
            disableFolderDrop={true}
            accounts={accounts}
            balanceTotalPerAccount={balanceTotalPerAccount}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
