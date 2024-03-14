import {
  DndContext,
  DragEndEvent,
  DragMoveEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  DropAnimation,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  UniqueIdentifier,
  closestCenter,
  defaultDropAnimation,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  AccountsCatalogTree,
  RequestAccountsCatalogAction,
  runActionOnTrees,
} from "@extension/core"
import { AccountJsonAny } from "@extension/core"
import { api } from "@ui/api"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"

import { sortableTreeKeyboardCoordinates } from "./keyboardCoordinates"
import { SortableTreeItem } from "./SortableTreeItem"
import type { FlattenedItem, SensorContext, UiTree } from "./types"
import { flattenTree, getChildCount, getProjection, removeChildrenOf } from "./util"

type Props = {
  accounts: AccountJsonAny[]
  balanceTotalPerAccount: Record<string, number>
  treeName: AccountsCatalogTree
  tree: UiTree
  indentationWidth?: number
}

export const AccountsList = ({
  accounts,
  balanceTotalPerAccount,
  treeName,
  tree,
  indentationWidth = 50,
}: Props) => {
  const [items, setItems] = useState(() => tree ?? [])
  useEffect(() => {
    setItems(tree ?? [])
  }, [tree])

  const [closedFolders, setClosedFolders] = useState<UniqueIdentifier[]>([])
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)
  const [overId, setOverId] = useState<UniqueIdentifier | null>(null)
  const [offsetLeft, setOffsetLeft] = useState(0)

  const flattenedItems = useMemo(() => {
    const flattenedTree = flattenTree(items)
    const collapsedFolders = flattenedTree
      .filter((item) => item.type === "folder" && closedFolders.includes(item.id))
      .map((item) => item.id)

    return removeChildrenOf(
      flattenedTree,
      activeId ? [activeId, ...collapsedFolders] : collapsedFolders
    )
  }, [activeId, items, closedFolders])
  const projected =
    activeId && overId
      ? getProjection(flattenedItems, activeId, overId, offsetLeft, indentationWidth)
      : null
  const sensorContext: SensorContext = useRef({
    items: flattenedItems,
    offset: offsetLeft,
  })
  const [coordinateGetter] = useState(() =>
    sortableTreeKeyboardCoordinates(sensorContext, false, indentationWidth)
  )
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter,
    })
  )

  const sortedIds = useMemo(() => flattenedItems.map(({ id }) => id), [flattenedItems])
  const activeItem = activeId ? flattenedItems.find(({ id }) => id === activeId) : null

  useEffect(() => {
    sensorContext.current = {
      items: flattenedItems,
      offset: offsetLeft,
    }
  }, [flattenedItems, offsetLeft])

  const resetState = useCallback(() => {
    setOverId(null)
    setActiveId(null)
    setOffsetLeft(0)

    document.body.style.setProperty("cursor", "")
  }, [])

  const handleDragStart = useCallback(({ active: { id: activeId } }: DragStartEvent) => {
    setActiveId(activeId)
    setOverId(activeId)

    document.body.style.setProperty("cursor", "grabbing")
  }, [])

  const handleDragMove = useCallback(({ delta }: DragMoveEvent) => setOffsetLeft(delta.x), [])
  const handleDragOver = useCallback(({ over }: DragOverEvent) => setOverId(over?.id ?? null), [])
  const handleDragCancel = useCallback(() => resetState(), [resetState])

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      resetState()

      if (projected && over) {
        const { nextItem, parentId } = projected
        const flattenedItems: FlattenedItem[] = flattenTree(items)

        const activeIndex = flattenedItems.findIndex(({ id }) => id === active.id)
        const activeTreeItem = flattenedItems[activeIndex]

        const parentIndex = flattenedItems.findIndex(({ id }) => id === parentId)
        const parentTreeItem = flattenedItems[parentIndex]

        const folderId =
          parentTreeItem && parentTreeItem.type === "folder" ? parentTreeItem.id : undefined
        const beforeItem =
          nextItem?.type === "account"
            ? ({ type: "account", address: nextItem.address } as const)
            : nextItem?.type === "folder"
            ? ({ type: "folder", id: nextItem.id } as const)
            : undefined

        const action: RequestAccountsCatalogAction =
          activeTreeItem.type === "account"
            ? {
                type: "moveAccount",
                tree: treeName,
                address: activeTreeItem.address,
                folderId,
                beforeItem,
              }
            : { type: "moveFolder", tree: treeName, id: activeTreeItem.id, beforeItem }

        // in order for the drag and drop UI to work correctly, we have to immediately update the state in react
        // i.e. we can't wait for the `api.accountsCatalogRunActions` call to complete
        //
        // if we try to wait, the hovering element will return to its old location instead of the new location that is has been dropped into
        //
        // by calling the same method here which the backend will call on its store, we'll predict the outcome without waiting
        //
        // once the backend has processed the action, the state in the UI will be thrown away in favour of the new backend state
        setItems((items) => {
          const newItems = items.slice()
          runActionOnTrees({ [treeName]: newItems })(action)
          return newItems
        })
        api.accountsCatalogRunActions([action])
      }
    },
    [items, projected, resetState, treeName]
  )

  const handleCollapse = useCallback(
    (id: UniqueIdentifier) =>
      setClosedFolders((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id])),
    []
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      measuring={measuring}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={sortedIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-4">
          {flattenedItems.map((item) => (
            <SortableTreeItem
              key={item.id}
              id={item.id}
              depth={item.id === activeId && projected ? projected.depth : item.depth}
              accounts={accounts}
              balanceTotalPerAccount={balanceTotalPerAccount}
              item={item}
              treeName={treeName}
              indentationWidth={indentationWidth}
              collapsed={closedFolders.includes(item.id) || activeId === item.id}
              onCollapse={item.type === "folder" ? () => handleCollapse(item.id) : undefined}
            />
          ))}
        </div>
        {createPortal(
          <DragOverlay dropAnimation={dropAnimationConfig}>
            {activeId && activeItem ? (
              <SortableTreeItem
                id={activeId}
                depth={activeItem.depth}
                accounts={accounts}
                balanceTotalPerAccount={balanceTotalPerAccount}
                item={activeItem}
                treeName={treeName}
                clone
                childCount={getChildCount(items, activeId)}
                indentationWidth={indentationWidth}
              />
            ) : null}
          </DragOverlay>,
          document.body
        )}
      </SortableContext>
    </DndContext>
  )
}

const measuring = {
  droppable: {
    strategy: MeasuringStrategy.Always,
  },
}

const dropAnimationConfig: DropAnimation = {
  keyframes({ transform }) {
    return [
      { opacity: 1, transform: CSS.Transform.toString(transform.initial) },
      {
        opacity: 0,
        transform: CSS.Transform.toString({
          ...transform.final,
          x: transform.final.x + 5,
          y: transform.final.y + 5,
        }),
      },
    ]
  },
  easing: "ease-out",
  sideEffects({ active }) {
    active.node.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: defaultDropAnimation.duration,
      easing: defaultDropAnimation.easing,
    })
  },
}
