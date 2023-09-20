import { CSSProperties, FC, memo, useEffect, useMemo, useRef } from "react"
import { useMeasure } from "react-use"

import { MYSTICAL_PHYSICS_V3, MysticalPhysicsV3 } from "./MysticalPhysicsV3"
import { ParentSize, useCelestialArtifact } from "./useCelestialArtifact"

const CelestialArtifact = memo(
  ({
    index,
    parentSize,
    config,
    color,
  }: {
    index: number
    parentSize: ParentSize
    config: MysticalPhysicsV3
    // force color
    color?: string
  }) => {
    const artifact = useCelestialArtifact(config, parentSize, index, color)

    // const gradientMemo = useMemo(
    //   () => (
    //     <radialGradient
    //       id={gradientId}
    //       key={gradientId}
    //       cx="50%"
    //       cy="50%"
    //       r="50%"
    //       fx="50%"
    //       fy="50%"
    //     >
    //       <stop offset="0%" style={{ stopColor: "#fff", stopOpacity: 0.9 }} />
    //       <stop offset="90%" style={{ stopColor: "#fff", stopOpacity: 0 }} />
    //     </radialGradient>
    //   ),

    //   [gradientId]
    // )
    // const maskMemo = useMemo(
    //   () => (
    //     <mask id={maskId} key={maskId} x="0" y="0" width="1" height="1">
    //       <ellipse {...artifact.ellipsis} fill={gradientUrl}></ellipse>
    //     </mask>
    //   ),
    //   [artifact.ellipsis, gradientUrl, maskId]
    // )
    // const rectMemo = useMemo(
    //   () => <rect x="0" y="0" width="100%" height="100%" fill={artifact.color} mask={maskUrl} />,
    //   [artifact.color, maskUrl]
    // )

    // useMemo(() => {
    //   // eslint-disable-next-line no-console
    //   console.log("artifact id", id, color, artifact)
    // }, [artifact, color, id])

    const refInitialized = useRef(false)

    useEffect(() => {
      refInitialized.current = false
    }, [])

    // const [style1, style2] = useMemo<[CSSProperties, CSSProperties]>(
    //   () => [
    //     {
    //       // stopColor: artifact.color,
    //       stopColor: "#fff",
    //       stopOpacity: 0.9,
    //       // transitionProperty: "stop-color",
    //       // transitionDuration: `${artifact.duration}ms`,
    //       // transitionDelay: "100ms", // prevents flickering on FF
    //     },
    //     {
    //       // stopColor: artifact.color,
    //       stopColor: "#fff",
    //       stopOpacity: 0,
    //       // transitionProperty: "stop-color",
    //       // transitionDuration: `${artifact.duration}ms`,
    //       // transitionDelay: "100ms",
    //     },
    //   ],
    //   []
    // )

    // useEffect(() => {
    //   // const common = {
    //   //   // stopColor: artifact.color,
    //   //   stopColor: "#ffffff",
    //   //   // transitionProperty: "stop-color",
    //   //   // transitionDuration: `${artifact.duration}ms`,
    //   //   // transitionDelay: "100ms", // prevents flickering on FF
    //   // }
    //   // eslint-disable-next-line no-console
    //   // console.log("set gradient for", id)
    //   // setGradient(
    //   //   <g key={id}>
    //   //     <radialGradient id={id} cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
    //   //       <stop
    //   //         offset="0%"
    //   //         style={{
    //   //           ...common,
    //   //           stopOpacity: 0.9,
    //   //         }}
    //   //       />
    //   //       <stop
    //   //         offset="90%"
    //   //         style={{
    //   //           ...common,
    //   //           stopOpacity: 0,
    //   //         }}
    //   //       />
    //   //     </radialGradient>
    //   //     <mask id={`mask-${id}`} x="0" y="0" width="1" height="1">
    //   //       <ellipse {...artifact.ellipsis} fill={`url(#${id})`}></ellipse>
    //   //     </mask>
    //   //   </g>
    //   //   // <radialGradient id={id} key={id} cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
    //   //   //   <stop offset="0%" style={style1} />
    //   //   //   <stop offset="90%" style={style2} />
    //   //   // </radialGradient>
    //   // )
    //   // return () => setGradient(null)
    // }, [artifact.ellipsis, id, setGradient])

    // useEffect(() => {
    //   setDef({ id, style1, style2 })
    // }, [id, setDef, style1, style2])

    // return (
    // {/* <g> */}
    {
      /* <defs>
          <radialGradient id={id} cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" style={style1} />
            <stop offset="90%" style={style2} />
          </radialGradient>
        </defs> */
    }
    // return <ellipse {...artifact.ellipsis} fill={`url(#${id})`}></ellipse>
    // return <ellipse {...artifact.ellipsis} fill={artifact.color}></ellipse>
    return <div style={artifact} />
    //   // <>
    //     {/* <defs>
    //       {gradientMemo}
    //       {maskMemo}
    //     </defs>
    //     {rectMemo} */}
    //   {/* </> */}
    // // {/* </g> */}
    // // )
  }
)
CelestialArtifact.displayName = "CelestialArtifact"

const CelestialArtifacts: FC<{
  size: ParentSize
  config: MysticalPhysicsV3
}> = ({ size, config }) => {
  const artifactKeys = useMemo(() => [...Array(config.artifacts).keys()], [config.artifacts])
  if (!size.width || !size.height) return null

  return (
    <>
      {artifactKeys.map((key, index) => (
        <CelestialArtifact
          key={key}
          index={index}
          parentSize={size}
          config={config}
          color={config.colors?.[key % config.colors.length]}
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
  const [refSize, size] = useMeasure<HTMLDivElement>()
  const mergedConfig = useMemo(() => ({ ...MYSTICAL_PHYSICS_V3, ...(config ?? {}) }), [config])

  const style = useMemo<CSSProperties>(
    () => ({
      userSelect: "none",
      transform: mergedConfig.blur >= 0 ? `blur(${mergedConfig.blur}px)` : undefined,
    }),
    [mergedConfig.blur]
  )

  return (
    <div ref={refSize} className={className} style={style}>
      <CelestialArtifacts config={mergedConfig} size={size} />
    </div>
  )
}
