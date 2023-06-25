import type { UniqueIdentifier } from "@dnd-kit/core"
import { arrayMove } from "@dnd-kit/sortable"

import type { FlattenedItem, UiTree, UiTreeItem } from "./types"

export const iOS = /iPad|iPhone|iPod/.test(navigator.platform)

const getDragDepth = (offset: number, indentationWidth: number) =>
  Math.round(offset / indentationWidth)

export function getProjection(
  items: FlattenedItem[],
  activeId: UniqueIdentifier,
  overId: UniqueIdentifier,
  dragOffset: number,
  indentationWidth: number
) {
  const overItemIndex = items.findIndex(({ id }) => id === overId)
  const activeItemIndex = items.findIndex(({ id }) => id === activeId)
  const activeItem = items[activeItemIndex]
  const newItems = arrayMove(items, activeItemIndex, overItemIndex)
  const previousItem = newItems[overItemIndex - 1]
  const nextItem = newItems[overItemIndex + 1]
  const dragDepth = getDragDepth(dragOffset, indentationWidth)
  const projectedDepth = activeItem.depth + dragDepth
  const maxDepth = getMaxDepth({ activeItem, previousItem })
  const minDepth = getMinDepth({ nextItem })
  let depth = projectedDepth

  if (projectedDepth >= maxDepth) {
    depth = maxDepth
  } else if (projectedDepth < minDepth) {
    depth = minDepth
  }

  const parentId = (() => {
    if (depth === 0 || !previousItem) return null
    if (depth === previousItem.depth) return previousItem.parentId
    if (depth > previousItem.depth) return previousItem.id

    const newParent = newItems
      .slice(0, overItemIndex)
      .reverse()
      .find((item) => item.depth === depth)?.parentId

    return newParent ?? null
  })()

  return { depth, maxDepth, minDepth, parentId, nextItem }
}

const getMaxDepth = ({
  activeItem,
  previousItem,
}: {
  activeItem: FlattenedItem
  previousItem: FlattenedItem
}) => {
  if (activeItem.type === "folder") return 0
  if (previousItem && previousItem.type === "folder") return previousItem.depth + 1
  if (previousItem) return previousItem.depth
  return 0
}
const getMinDepth = ({ nextItem }: { nextItem: FlattenedItem }) => (nextItem ? nextItem.depth : 0)

const flatten = (
  items: UiTree,
  parentId: UniqueIdentifier | null = null,
  depth = 0
): FlattenedItem[] =>
  items.flatMap((item, index): FlattenedItem[] =>
    item.type === "account"
      ? [{ ...item, parentId, depth, index }]
      : [{ ...item, parentId, depth, index }, ...flatten(item.tree, item.id, depth + 1)]
  )

export const flattenTree = (items: UiTree): FlattenedItem[] => flatten(items)

export const findItem = (items: UiTreeItem[], itemId: UniqueIdentifier) =>
  items.find(({ id }) => id === itemId)

export const findItemDeep = (items: UiTree, itemId: UniqueIdentifier): UiTreeItem | undefined => {
  for (const item of items) {
    const { id } = item

    if (id === itemId) return item

    if (item.type === "folder" && item.tree.length) {
      const child = findItemDeep(item.tree, itemId)

      if (child) return child
    }
  }

  return undefined
}

const countChildren = (items: UiTreeItem[], count = 0): number =>
  items.reduce((acc, item) => {
    if (item.type === "folder" && item.tree.length) return countChildren(item.tree, acc + 1)

    return acc + 1
  }, count)

export const getChildCount = (items: UiTree, id: UniqueIdentifier) => {
  const item = findItemDeep(items, id)

  return item && item.type === "folder" ? countChildren(item.tree) : 0
}

export const removeChildrenOf = (items: FlattenedItem[], ids: UniqueIdentifier[]) => {
  const excludeParentIds = [...ids]

  return items.filter((item) => {
    if (item.parentId && excludeParentIds.includes(item.parentId)) {
      if (item.type === "folder" && item.tree.length) {
        excludeParentIds.push(item.id)
      }
      return false
    }

    return true
  })
}
