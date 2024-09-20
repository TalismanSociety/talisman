import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { FC, useCallback, useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { useTranslation } from "react-i18next"

import { AccountJsonAny, AccountsCatalogTree } from "@extension/core"
import { api } from "@ui/api"

import type { UiTree, UiTreePosition } from "./types"
import { TreeItem, TreeItems } from "./TreeItems"
import { getTreeItemsMap, moveTreeItem, uiTreeToDataTree } from "./util"

export const ManageAccountsList: FC<{
  accounts: AccountJsonAny[]
  balanceTotalPerAccount: Record<string, number>
  treeName: AccountsCatalogTree
  tree: UiTree
}> = ({ accounts, balanceTotalPerAccount, treeName, tree }) => {
  const { t } = useTranslation()
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
    <div>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <TreeItems
          treeName={treeName}
          parentId="root"
          items={items}
          disableFolderDrop={isDraggingFolder}
          accounts={accounts}
          balanceTotalPerAccount={balanceTotalPerAccount}
        />

        {draggedItem
          ? createPortal(
              <DragOverlay>
                <TreeItem
                  treeName={treeName}
                  item={draggedItem}
                  isDragged
                  disableFolderDrop={true}
                  accounts={accounts}
                  balanceTotalPerAccount={balanceTotalPerAccount}
                />
              </DragOverlay>,
              document.getElementById("main") ?? document.body
            )
          : null}
      </DndContext>
      {!items.filter((i) => i.isVisible).length && (
        <div className="bg-grey-850 text-body-disabled flex h-40 items-center justify-center rounded text-sm">
          {t("No accounts found")}
        </div>
      )}
    </div>
  )
}
