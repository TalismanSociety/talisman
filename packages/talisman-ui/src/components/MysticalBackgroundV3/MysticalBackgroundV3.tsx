import { classNames } from "@talismn/util"
import { CSSProperties, FC, memo, useEffect, useMemo, useRef, useState } from "react"
import { useMeasure, useMouse } from "react-use"
import { UseMeasureRect } from "react-use/lib/useMeasure"

import {
  MYSTICAL_PHYSICS_V3,
  MysticalPhysicsV3,
  MysticalPhysicsV3NoAcolyte,
} from "./MysticalPhysicsV3"
import { ParentSize, useCelestialArtifact } from "./useCelestialArtifact"
import { useWindowHovered } from "./useWindowHovered"

const CelestialArtifact = memo(
  ({
    parentSize,
    config,
    x,
    y,
    color,
  }: {
    parentSize: ParentSize
    config: MysticalPhysicsV3

    // force target position if this artifact is an acolyte
    x?: number
    y?: number

    // force color
    color?: string
  }) => {
    const [id] = useState(() => crypto.randomUUID())
    const artifact = useCelestialArtifact(config, parentSize, x, y, color)

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
          transitionDelay: "100ms", // prevents flickering on FF
        },
        {
          stopColor: artifact.color,
          stopOpacity: 0,
          transitionProperty: "stop-color",
          transitionDuration: `${artifact.duration}ms`,
          transitionDelay: "100ms",
        },
      ],
      [artifact.color, artifact.duration]
    )

    return (
      <g>
        <defs>
          <radialGradient id={id} cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" style={style1} />
            <stop offset="90%" style={style2} />
          </radialGradient>
        </defs>
        <ellipse {...artifact.ellipsis} fill={`url(#${id})`}></ellipse>
      </g>
    )
  }
)

CelestialArtifact.displayName = "CelestialArtifact"

const CelestialArtifacts: FC<{
  size: ParentSize
  config: MysticalPhysicsV3
  acolyte?: { x: number; y: number }
}> = ({ size, config, acolyte }) => {
  const artifactKeys = useMemo(() => Array.from(Array(config.artifacts).keys()), [config.artifacts])
  if (!size.width || !size.height) return null
  return (
    <>
      {artifactKeys.map((i) => (
        <CelestialArtifact
          key={i}
          parentSize={size}
          config={config}
          color={config.colors?.[i % config.colors.length]}
        />
      ))}
      {config.withAcolyte && (
        <CelestialArtifact
          parentSize={size}
          config={config}
          {...acolyte}
          color={config.colors?.[artifactKeys.length % config.colors.length]}
        />
      )}
    </>
  )
}

type MysticalBackgroundInnerProps = {
  config: MysticalPhysicsV3NoAcolyte | MysticalPhysicsV3
  viewConfig: {
    style: { transform: string }
    viewBox: string
    size: UseMeasureRect
  }
  className?: string
}

export const MysticalBackgroundV3WithAcolyte = ({
  className,
  config,
  viewConfig,
}: MysticalBackgroundInnerProps) => {
  const { size, viewBox, style } = viewConfig
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
    <svg
      ref={refMouseLocation}
      width={size.width}
      height={size.height}
      viewBox={viewBox}
      className={classNames(className)}
      style={style}
    >
      <CelestialArtifacts config={config} size={size} acolyte={acolyte} />
    </svg>
  )
}

export const MysticalBackgroundV3NoAcolyte = ({
  className,
  config,
  viewConfig,
}: MysticalBackgroundInnerProps) => {
  const { size, viewBox, style } = viewConfig

  return (
    <svg
      width={size.width}
      height={size.height}
      viewBox={viewBox}
      className={classNames(className)}
      style={style}
    >
      <CelestialArtifacts config={config} size={size} />
    </svg>
  )
}

export const MysticalBackgroundV3 = ({
  className,
  config,
}: {
  config?: Partial<MysticalPhysicsV3>
  className?: string
}) => {
  const mergedConfig = config ? { ...MYSTICAL_PHYSICS_V3, ...config } : MYSTICAL_PHYSICS_V3

  const [refSize, size] = useMeasure<HTMLDivElement>()

  const viewBox = useMemo(() => `0 0 ${size.width} ${size.height}`, [size.width, size.height])
  const style = useMemo(() => ({ transform: `blur(${mergedConfig.blur}ptx)` }), [mergedConfig.blur])

  return (
    <div ref={refSize} className={className}>
      {!mergedConfig.withAcolyte && (
        <MysticalBackgroundV3NoAcolyte
          viewConfig={{ style, viewBox, size }}
          className={className}
          config={mergedConfig}
        />
      )}
      {mergedConfig.withAcolyte && (
        <MysticalBackgroundV3WithAcolyte
          viewConfig={{ style, viewBox, size }}
          className={className}
          config={mergedConfig}
        />
      )}
    </div>
  )
}
