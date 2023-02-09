import { classNames } from "@talismn/util"
import { useEffect, useMemo, useRef, useState } from "react"

import { LOGIN_PHYSICS, LoginPhysics } from "./LoginPhysics"
import { ParentSize, useLoginArtifact } from "./useLoginArtifact"

const LoginArtifact = ({
  color,
  parentSize,
  config,
}: {
  color: string
  parentSize: ParentSize
  config: LoginPhysics
}) => {
  const [id] = useState(() => crypto.randomUUID())
  const artifact = useLoginArtifact(config, parentSize)

  const refInitialized = useRef(false)

  useEffect(() => {
    refInitialized.current = false
  }, [])

  return (
    <>
      <defs>
        <radialGradient id={id} cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <stop offset="0%" style={{ stopColor: color, stopOpacity: 1 }} />
          <stop offset="90%" style={{ stopColor: color, stopOpacity: 0 }} />
        </radialGradient>
      </defs>
      <ellipse {...artifact.ellipsis} fill={`url(#${id})`}></ellipse>
    </>
  )
}

export const LoginBackground = ({
  className,
  colors,
  width = 400,
  height = 600,
  config = LOGIN_PHYSICS,
}: {
  config?: LoginPhysics
  colors: [string, string]
  width: number
  height: number
  className?: string
}) => {
  const size = useMemo(() => ({ width, height }), [width, height])

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={classNames(className)}
      style={{ transform: `blur(${config.blur}ptx)` }}
    >
      <LoginArtifact parentSize={size} config={config} color={colors[0]} />
      <LoginArtifact parentSize={size} config={config} color={colors[0]} />
      <LoginArtifact parentSize={size} config={config} color={colors[0]} />
      <LoginArtifact parentSize={size} config={config} color={colors[1]} />
      <LoginArtifact parentSize={size} config={config} color={colors[1]} />
      <LoginArtifact parentSize={size} config={config} color={colors[1]} />
    </svg>
  )
}
