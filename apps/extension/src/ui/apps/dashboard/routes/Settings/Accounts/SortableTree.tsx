import { PortfolioStore } from "@core/domains/accounts/store.portfolio"
import { RequestPortfolioMutate } from "@core/domains/accounts/types"
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
import { api } from "@ui/api"
import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"

import { sortableTreeKeyboardCoordinates } from "./keyboardCoordinates"
import { SortableTreeItem } from "./SortableTreeItem"
import type { FlattenedItem, SensorContext, UiTree } from "./types"
import { flattenTree, getChildCount, getProjection, removeChildrenOf } from "./utilities"

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

interface Props {
  collapsible?: boolean
  tree?: UiTree
  indentationWidth?: number
}

export function SortableTree({ collapsible, tree, indentationWidth = 50 }: Props) {
  const [items, setItems] = useState(() => tree ?? [])
  useEffect(() => {
    setItems(tree ?? [])
  }, [tree])
  const [openFolders, setOpenFolders] = useState<UniqueIdentifier[]>([])
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)
  const [overId, setOverId] = useState<UniqueIdentifier | null>(null)
  const [offsetLeft, setOffsetLeft] = useState(0)

  const flattenedItems = useMemo(() => {
    const flattenedTree = flattenTree(items)
    const collapsedFolders = flattenedTree
      .filter((item) => item.type === "folder" && !openFolders.includes(item.id))
      .map((item) => item.id)

    return removeChildrenOf(
      flattenedTree,
      activeId ? [activeId, ...collapsedFolders] : collapsedFolders
    )
  }, [activeId, items, openFolders])
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
        {flattenedItems.map((item) => (
          <SortableTreeItem
            key={item.id}
            id={item.id}
            value={item.id}
            depth={item.id === activeId && projected ? projected.depth : item.depth}
            indentationWidth={indentationWidth}
            collapsed={!openFolders.includes(item.id)}
            onCollapse={
              collapsible && item.type === "folder" && item.tree.length
                ? () => handleCollapse(item.id)
                : undefined
            }
          />
        ))}
        {createPortal(
          <DragOverlay dropAnimation={dropAnimationConfig}>
            {activeId && activeItem ? (
              <SortableTreeItem
                id={activeId}
                depth={activeItem.depth}
                clone
                childCount={getChildCount(items, activeId) + 1}
                value={activeId.toString()}
                indentationWidth={indentationWidth}
              />
            ) : null}
          </DragOverlay>,
          document.body
        )}
      </SortableContext>
    </DndContext>
  )

  function handleDragStart({ active: { id: activeId } }: DragStartEvent) {
    setActiveId(activeId)
    setOverId(activeId)

    document.body.style.setProperty("cursor", "grabbing")
  }

  function handleDragMove({ delta }: DragMoveEvent) {
    setOffsetLeft(delta.x)
  }

  function handleDragOver({ over }: DragOverEvent) {
    setOverId(over?.id ?? null)
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    resetState()

    if (projected && over) {
      const { nextItem, parentId } = projected
      const flattenedItems: FlattenedItem[] = flattenTree(items)

      const activeIndex = flattenedItems.findIndex(({ id }) => id === active.id)
      const activeTreeItem = flattenedItems[activeIndex]

      const parentIndex = flattenedItems.findIndex(({ id }) => id === parentId)
      const parentTreeItem = flattenedItems[parentIndex]

      const folder =
        parentTreeItem && parentTreeItem.type === "folder" ? parentTreeItem.name : undefined
      const beforeItem =
        nextItem?.type === "account"
          ? ({ type: "account", address: nextItem.address } as const)
          : nextItem?.type === "folder"
          ? ({ type: "folder", name: nextItem.name } as const)
          : undefined

      const mutation: RequestPortfolioMutate =
        activeTreeItem.type === "account"
          ? { type: "moveAccount", address: activeTreeItem.address, folder, beforeItem }
          : { type: "moveFolder", name: activeTreeItem.name, beforeItem }

      setItems((items) => {
        const newItems = items.slice()
        PortfolioStore.mutateTree(newItems, [mutation])
        return newItems
      })
      api.accountsPortfolioMutate([mutation])
    }
  }

  function handleDragCancel() {
    resetState()
  }

  function resetState() {
    setOverId(null)
    setActiveId(null)
    setOffsetLeft(0)

    document.body.style.setProperty("cursor", "")
  }

  function handleCollapse(id: UniqueIdentifier) {
    setOpenFolders((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]))
  }
}
