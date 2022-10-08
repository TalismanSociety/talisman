import { useWindowHovered } from "./useWindowHovered"
import { useMemo, useRef } from "react"
import { useMeasure, useMouse } from "react-use"

import MysticalCanvas from "./MysticalCanvas"
import { classNames } from "../../utils"

export const MysticalBackground = ({ className }: { className?: string }) => {
  const [refSize, size] = useMeasure<HTMLDivElement>()
  const refMouseLocation = useRef<HTMLDivElement>(null)
  const { elX, elY, elW, elH } = useMouse(refMouseLocation)

  // useMouse doesn't detect if cursor goes out of the screen, so we also need to check for window hovering
  const isWindowHovered = useWindowHovered()

  // props for the artifact that follows mouse cursor
  const acolyte = useMemo(
    () =>
      isWindowHovered && !!elX && !!elY && elX > 0 && elX < elW && elY > 0 && elY < elH
        ? { cx: elX, cy: elY }
        : {},
    [elH, elW, elX, elY, isWindowHovered]
  )

  return (
    <div ref={refSize} className={classNames("relative", className)}>
      <div ref={refMouseLocation} className="absolute top-0 left-0 h-full w-full">
        {!!size.height && (
          <MysticalCanvas
            size={size}
            {...acolyte}
            className="absolute top-0 left-0 h-full w-full"
          />
        )}
      </div>
    </div>
  )
}
