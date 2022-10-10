import { useWindowHovered } from "./useWindowHovered"
import { useRef } from "react"
import { useMeasure, useMouse } from "react-use"

import MysticalCanvas from "./MysticalCanvas"
import { classNames } from "../../utils"
import { MysticalPhysics, MYSTICAL_PHYSICS } from "./MysticalPhysics"

export const MysticalBackground = ({
  className,
  config = MYSTICAL_PHYSICS,
}: {
  config?: MysticalPhysics
  className?: string
}) => {
  const [refSize, size] = useMeasure<HTMLDivElement>()
  const refMouseLocation = useRef<HTMLDivElement>(null)
  const { elX, elY, elW, elH } = useMouse(refMouseLocation)

  // useMouse doesn't detect if cursor goes out of the screen, so we also need to check for window hovering
  const isWindowHovered = useWindowHovered()

  // props for the artifact that follows mouse cursor
  // changes a lot when hovering, do not memoize
  const acolyte =
    isWindowHovered && !!elX && !!elY && elX > 0 && elX < elW && elY > 0 && elY < elH
      ? { cx: elX, cy: elY }
      : {}

  return (
    <div ref={refSize} className={classNames(className)}>
      <div ref={refMouseLocation} className="absolute top-0 left-0 h-full w-full">
        {config && !!size.height && (
          <MysticalCanvas
            size={size}
            config={config}
            {...acolyte}
            className="absolute top-0 left-0 h-full w-full"
          />
        )}
      </div>
    </div>
  )
}
