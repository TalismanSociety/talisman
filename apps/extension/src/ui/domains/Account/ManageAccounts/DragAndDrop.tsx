import { useDraggable, useDroppable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { classNames } from "@talismn/util"
import { CSSProperties, FC, ReactNode, useMemo } from "react"

import { UiTreePosition } from "./types"

export const TreeDraggable: FC<{
  id: string
  parentId: string
  index: number
  children?: ReactNode
}> = ({ id, parentId, index, children }) => {
  const data = useMemo<UiTreePosition>(() => ({ parentId, index }), [parentId, index])

  const { transform, setNodeRef, attributes, listeners } = useDraggable({
    id,
    data,
  })

  const style: CSSProperties = useMemo(
    () => ({
      transform: CSS.Transform.toString(transform),
    }),
    [transform]
  )

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  )
}

export const TreeDroppable: FC<{
  children?: ReactNode
  className?: string
  isOverClassName?: string
  hasOverClassName?: string
  disabled?: boolean
  parentId: string
  index: number
}> = ({ children, className, isOverClassName, hasOverClassName, disabled, parentId, index }) => {
  const [id, data] = useMemo<[string, UiTreePosition]>(
    () => [`${parentId}::${index}`, { parentId, index }],
    [parentId, index]
  )

  const { setNodeRef, isOver, over } = useDroppable({ id, data, disabled })

  return (
    <div
      ref={setNodeRef}
      className={classNames(
        className,
        !disabled && !!over && hasOverClassName,
        !disabled && isOver && isOverClassName
      )}
    >
      {children}
    </div>
  )
}
