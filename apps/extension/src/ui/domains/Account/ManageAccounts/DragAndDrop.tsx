import type { KeyboardEvent, MouseEvent } from "react"
import {
  KeyboardSensor as LibKeyboardSensor,
  MouseSensor as LibMouseSensor,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { classNames } from "@talismn/util"
import { CSSProperties, FC, ReactNode, useMemo } from "react"

import { UiTreePosition } from "./types"

export const TreeDraggable: FC<{
  id: string
  parentId: string
  index: number
  disabled?: boolean
  className?: string
  children?: ReactNode
}> = ({ id, parentId, index, disabled, className, children }) => {
  const data = useMemo<UiTreePosition>(() => ({ parentId, index }), [parentId, index])

  const { transform, setNodeRef, attributes, listeners, isDragging } = useDraggable({
    id,
    data,
    disabled,
  })

  const style: CSSProperties = useMemo(
    () => ({
      transform: CSS.Transform.toString(transform),
    }),
    [transform],
  )

  return (
    <div className={"relative"}>
      <div
        className={classNames(
          "absolute left-0 top-0 size-full",
          "bg-grey-850/50 border-grey-800 rounded-sm border border-dashed",
          isDragging ? "visible" : "invisible",
        )}
      ></div>
      <div ref={setNodeRef} style={style} className={className} {...attributes} {...listeners}>
        {children}
      </div>
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
    [parentId, index],
  )

  const { setNodeRef, isOver, over } = useDroppable({ id, data, disabled })

  return (
    <div
      ref={setNodeRef}
      className={classNames(
        className,
        !disabled && !!over && hasOverClassName,
        !disabled && isOver && isOverClassName,
      )}
    >
      {children}
    </div>
  )
}

/**
 * Below sensors are used to prevent context menus clicks from triggering drag event, which results in context menus never opening.
 * https://github.com/clauderic/dnd-kit/issues/477#issuecomment-985194908
 */

export class MouseSensor extends LibMouseSensor {
  static activators = [
    {
      eventName: "onMouseDown" as const,
      handler: ({ nativeEvent: event }: MouseEvent) => {
        return shouldHandleEvent(event.target as HTMLElement)
      },
    },
  ]
}

export class KeyboardSensor extends LibKeyboardSensor {
  static activators = [
    {
      eventName: "onKeyDown" as const,
      handler: ({ nativeEvent: event }: KeyboardEvent<Element>) => {
        return shouldHandleEvent(event.target as HTMLElement)
      },
    },
  ]
}

function shouldHandleEvent(element: HTMLElement | null) {
  let cur = element

  while (cur) {
    if (cur.dataset && cur.dataset.noDnd) {
      return false
    }
    cur = cur.parentElement
  }

  return true
}
