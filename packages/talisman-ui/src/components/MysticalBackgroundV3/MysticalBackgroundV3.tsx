import { classNames } from "@talismn/util"
import { CSSProperties, memo, useLayoutEffect, useMemo, useRef } from "react"
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
      filter: mergedConfig.blur > 0 ? `blur(${mergedConfig.blur}px)` : undefined,
      userSelect: "none",
    }),
    [mergedConfig.blur]
  )

  return (
    <div ref={refSize} className={classNames("overflow-hidden", className)} style={style}>
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
          color={config.colors?.[index % config.colors.length]}
        />
      ))}
    </>
  )
}

const CelestialArtifact = memo((celestialProps: CelestialArtifactProps) => {
  const artifact = useCelestialArtifact(celestialProps)

  // initialize prevBackgroundRef with initial value of background
  const prevBackgroundRef = useRef<CSSProperties["background"]>(artifact.background)

  // this div will fade out (opacity 100 -> 0) with bg set to `prevBackgroundRef.current`
  const transitionOutRef = useRef<HTMLDivElement>(null)

  // this div will fade in (opacity 0 -> 100) with bg set to `artifact.background`
  const transitionInRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!transitionOutRef.current || !transitionInRef.current) return

    // update prevBackgroundRef for next transition
    prevBackgroundRef.current = artifact.background

    // get references to color-out and color-in (via opacity) artifacts
    const fromBg = transitionOutRef.current
    const toBg = transitionInRef.current

    // add opacity transition trigger
    setTimeout(() => {
      fromBg.classList.add("trigger-transition")
      toBg.classList.add("trigger-transition")
    }, 30)

    return () => {
      // remove trigger in preparation for next transition
      fromBg.classList.remove("trigger-transition")
      toBg.classList.remove("trigger-transition")
    }
  }, [artifact.background])

  return (
    // To achieve a smooth color transition without killing browser performance, we have to render
    // two artifacts for each artifact - one in the previous color and one in the new color.
    //
    // Then instead of using a css transition on the artifact color (bad for performance), we use a css
    // transition on the opacity to fade between the two artifacts.
    //
    // Also, we need to make sure that `transition-property` only includes `opacity` when we're actually running our transition.
    // We don't want it to be there when we reset the `opacity` back to the initial value.
    // (100 for transitionOutRef, 0 for transitionInRef)
    <>
      <div
        ref={transitionOutRef}
        className="opacity-100 transition-[transform] [&.trigger-transition]:opacity-0 [&.trigger-transition]:transition-[transform,opacity]"
        style={useMemo(() => ({ ...artifact, background: prevBackgroundRef.current }), [artifact])}
      />
      <div
        ref={transitionInRef}
        className="opacity-0 transition-[transform] [&.trigger-transition]:opacity-100 [&.trigger-transition]:transition-[transform,opacity]"
        style={artifact}
      />
    </>
  )
})
CelestialArtifact.displayName = "CelestialArtifact"
