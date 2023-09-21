import { CSSProperties, memo, useMemo } from "react"
import { useMeasure } from "react-use"

import { MYSTICAL_PHYSICS_V3, MysticalPhysicsV3 } from "./MysticalPhysicsV3"
import { CelestialArtifactProps, ParentSize, useCelestialArtifact } from "./useCelestialArtifact"

export const MysticalBackgroundV3 = ({
  className,
  config,
}: {
  config?: Partial<MysticalPhysicsV3>
  className?: string
}) => {
  const [refSize, size] = useMeasure<HTMLDivElement>()
  const mergedConfig = useMemo(() => ({ ...MYSTICAL_PHYSICS_V3, ...(config ?? {}) }), [config])

  const style = useMemo<CSSProperties>(
    () => ({
      filter: mergedConfig.blur >= 0 ? `blur(${mergedConfig.blur}px)` : undefined,
      userSelect: "none",
    }),
    [mergedConfig.blur]
  )

  return (
    <div ref={refSize} className={className} style={style}>
      <CelestialArtifacts config={mergedConfig} size={size} />
    </div>
  )
}

const CelestialArtifacts = ({ size, config }: { size: ParentSize; config: MysticalPhysicsV3 }) => {
  const artifactKeys = useMemo(() => [...Array(config.artifacts).keys()], [config.artifacts])
  if (!size.width || !size.height) return null

  return (
    <>
      {artifactKeys.map((key, index) => (
        <CelestialArtifact
          key={key}
          config={config}
          parentSize={size}
          artifactIndex={index}
          color={config.colors?.[key % config.colors.length]}
        />
      ))}
    </>
  )
}

const CelestialArtifact = memo((celestialProps: CelestialArtifactProps) => (
  <div style={useCelestialArtifact(celestialProps)} />
))
CelestialArtifact.displayName = "CelestialArtifact"
