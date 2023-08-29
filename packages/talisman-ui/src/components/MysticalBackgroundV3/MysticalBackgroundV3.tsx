import { classNames } from "@talismn/util"
import { CSSProperties, FC, memo, useEffect, useMemo, useRef, useState } from "react"
import { useMeasure } from "react-use"

import { MYSTICAL_PHYSICS_V3, MysticalPhysicsV3 } from "./MysticalPhysicsV3"
import { ParentSize, useCelestialArtifact } from "./useCelestialArtifact"

const CelestialArtifact = memo(
  ({
    parentSize,
    config,
    color,
  }: {
    parentSize: ParentSize
    config: MysticalPhysicsV3
    // force color
    color?: string
  }) => {
    const [id] = useState(() => crypto.randomUUID())
    const artifact = useCelestialArtifact(config, parentSize, color)

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
}> = ({ size, config }) => {
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
    </>
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
      <svg
        width={size.width}
        height={size.height}
        viewBox={viewBox}
        className={classNames(className)}
        style={style}
      >
        <CelestialArtifacts config={mergedConfig} size={size} />
      </svg>
    </div>
  )
}
