import { classNames } from "@talismn/util"
import { CSSProperties, FC, memo, useEffect, useMemo, useRef, useState } from "react"
import { useMeasure, useMouse } from "react-use"

import { useWindowHovered } from "../MysticalBackgroundV2/useWindowHovered"
import { MYSTICAL_PHYSICS_V3, MysticalPhysicsV3 } from "./MysticalPhysicsV3"
import { ParentSize, useCelestialArtifact } from "./useCelestialArtifact"

const CelestialArtifact = memo(
  ({
    parentSize,
    config,
    x,
    y,
  }: {
    parentSize: ParentSize
    config: MysticalPhysicsV3

    // force target position if this artifact is an acolyte
    x?: number
    y?: number
  }) => {
    const [id] = useState(() => crypto.randomUUID())
    const artifact = useCelestialArtifact(config, parentSize, x, y)

    const refInitialized = useRef(false)

    useEffect(() => {
      refInitialized.current = false
    }, [])

    const [style1, style2] = useMemo<[CSSProperties, CSSProperties]>(
      () => [
        {
          stopColor: artifact.color,
          stopOpacity: 0.9,
          transitionProperty: "stop-color",
          transitionDuration: `${artifact.duration}ms`,
        },
        {
          stopColor: artifact.color,
          stopOpacity: 0,
          transitionProperty: "stop-color",
          transitionDuration: `${artifact.duration}ms`,
        },
      ],
      [artifact.color, artifact.duration]
    )

    return (
      <>
        <defs>
          <radialGradient id={id} cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" style={style1} />
            <stop offset="90%" style={style2} />
          </radialGradient>
        </defs>
        <ellipse {...artifact.ellipsis} fill={`url(#${id})`}></ellipse>
      </>
    )
  }
)
CelestialArtifact.displayName = "CelestialArtifact"

const CelestialArtifacts: FC<{
  size: ParentSize
  config: MysticalPhysicsV3
  acolyte?: { x: number; y: number }
}> = ({ size, config, acolyte }) => {
  if (!size.width || !size.height) return null

  return (
    <>
      {[...Array(config.artifacts).keys()].map((i) => (
        <CelestialArtifact key={i} parentSize={size} config={config} />
      ))}
      {config.withAcolyte && <CelestialArtifact parentSize={size} config={config} {...acolyte} />}
    </>
  )
}

export const MysticalBackgroundV3 = ({
  className,
  config = MYSTICAL_PHYSICS_V3,
}: {
  config?: MysticalPhysicsV3
  className?: string
}) => {
  const [refSize, size] = useMeasure<HTMLDivElement>()
  const refMouseLocation = useRef<SVGSVGElement>(null)
  const { elX, elY, elW, elH } = useMouse(refMouseLocation)

  // useMouse doesn't detect if cursor goes out of the screen, so we also need to check for window hovering
  const isWindowHovered = useWindowHovered()

  // props for the artifact that follows mouse cursor
  // changes a lot when hovering, do not memoize
  const acolyte =
    isWindowHovered && !!elX && !!elY && elX > 0 && elX < elW && elY > 0 && elY < elH
      ? { x: elX, y: elY }
      : undefined

  return (
    <div ref={refSize} className={className}>
      <svg
        ref={refMouseLocation}
        width={size.width}
        height={size.height}
        viewBox={`0 0 ${size.width} ${size.height}`}
        className={classNames(className)}
        style={{ transform: `blur(${config.blur}ptx)` }}
      >
        <CelestialArtifacts config={config} size={size} acolyte={acolyte} />
      </svg>
    </div>
  )
}
