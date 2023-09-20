import { classNames } from "@talismn/util"
import { CSSProperties, FC, ReactNode, memo, useEffect, useMemo, useRef, useState } from "react"
import { useMeasure } from "react-use"

import { MYSTICAL_PHYSICS_V3, MysticalPhysicsV3 } from "./MysticalPhysicsV3"
import { ParentSize, useCelestialArtifact } from "./useCelestialArtifact"

const CelestialArtifact = memo(
  ({
    id,
    setGradient,
    parentSize,
    config,
    color,
  }: {
    id: string
    setGradient: (gradient: ReactNode) => void
    parentSize: ParentSize
    config: MysticalPhysicsV3
    // force color
    color?: string
  }) => {
    const artifact = useCelestialArtifact(config, parentSize, color)

    const [gradientId, gradientUrl] = useMemo(() => [`grad-${id}`, `url(#grad-${id})`], [id])
    const [maskId, maskUrl] = useMemo(() => [`mask-${id}`, `url(#mask-${id})`], [id])

    const gradientMemo = useMemo(
      () => (
        <radialGradient
          id={gradientId}
          key={gradientId}
          cx="50%"
          cy="50%"
          r="50%"
          fx="50%"
          fy="50%"
        >
          <stop offset="0%" style={{ stopColor: "#fff", stopOpacity: 0.9 }} />
          <stop offset="90%" style={{ stopColor: "#fff", stopOpacity: 0 }} />
        </radialGradient>
      ),

      [gradientId]
    )
    const maskMemo = useMemo(
      () => (
        <mask id={maskId} key={maskId} x="0" y="0" width="1" height="1">
          <ellipse {...artifact.ellipsis} fill={gradientUrl}></ellipse>
        </mask>
      ),
      [artifact.ellipsis, gradientUrl, maskId]
    )
    const rectMemo = useMemo(
      () => <rect x="0" y="0" width="100%" height="100%" fill={artifact.color} mask={maskUrl} />,
      [artifact.color, maskUrl]
    )

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
    return (
      <>
        <defs>
          {gradientMemo}
          {maskMemo}
        </defs>
        {rectMemo}
      </>
    )
    // {/* </g> */}
    // )
  }
)

CelestialArtifact.displayName = "CelestialArtifact"

const CelestialArtifacts: FC<{
  size: ParentSize
  config: MysticalPhysicsV3
}> = ({ size, config }) => {
  const [gradients, setGradients] = useState(new Map())

  const artifacts = useMemo(() => {
    const keys = [...Array(config.artifacts).keys()]
    // const ids = keys.map(() => crypto.randomUUID())
    // const ids = keys.map((key) => key.toString())
    // const ids = keys.map(() => `celestial-gradient-${Math.trunc(Math.random() * Math.pow(10, 8))}`)
    const ids = keys.map((key) => `celestial-${key}`)
    const setGradientFuncs = ids.map(
      (id) => (gradient: ReactNode) =>
        setGradients((existing) => new Map(existing).set(id, gradient))
    )

    return new Map(keys.map((key) => [key, { id: ids[key], setGradient: setGradientFuncs[key] }]))
  }, [config.artifacts])

  if (!size.width || !size.height) return null

  return (
    <>
      <defs>{Array.from(gradients.values())}</defs>
      {Array.from(artifacts, ([key, { id, setGradient }]) => (
        <CelestialArtifact
          key={key}
          id={id}
          setGradient={setGradient}
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
  const mergedConfig = config ? { ...MYSTICAL_PHYSICS_V3, ...config } : MYSTICAL_PHYSICS_V3

  // const [refSize, size] = useMeasure<HTMLDivElement>()
  const [refSize, size] = useMeasure<SVGSVGElement>()

  const viewBox = useMemo(() => `0 0 ${size.width} ${size.height}`, [size.width, size.height])
  const style = useMemo(
    () => ({ transform: mergedConfig.blur >= 0 ? `blur(${mergedConfig.blur}ptx)` : undefined }),
    [mergedConfig.blur]
  )

  return (
    // <div ref={refSize} className={className}>
    <svg
      ref={refSize}
      // width={size.width}
      // height={size.height}
      viewBox={viewBox}
      className={classNames(className)}
      style={style}
    >
      <CelestialArtifacts config={mergedConfig} size={size} />
    </svg>
    // </div>
  )
}
