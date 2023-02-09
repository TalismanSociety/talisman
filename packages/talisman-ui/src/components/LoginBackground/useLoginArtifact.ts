import { SVGProps, useEffect, useMemo, useRef, useState } from "react"

import { LoginPhysics } from "./LoginPhysics"

export type ParentSize = {
  width: number
  height: number
}

export type ArtifactCharacteristics = {
  ellipsis: SVGProps<SVGEllipseElement>
  duration: number
}

const roundDecimal = (value: number, decimals: number) => {
  const mult = Math.pow(10, decimals)
  return Math.round(mult * value) / mult
}

const generateCharacteristics = (
  config: LoginPhysics,
  parentSize: ParentSize,
  duration: number,
  initialized: boolean
) => {
  const maxSize = Math.min(parentSize.width, parentSize.height)
  const rx = roundDecimal(
    maxSize * (config.radiusMin + Math.random() * (config.radiusMax - config.radiusMin)),
    2
  )
  const ry = roundDecimal(rx * (1 - config.ellipsisRatio * Math.random()), 2)

  const cx = roundDecimal(Math.random() * parentSize.width, 2)
  const cy = roundDecimal(Math.random() * parentSize.height - Math.max(rx, ry) / 2, 2)

  const ellipsis: SVGProps<SVGEllipseElement> = {
    cx,
    cy,
    rx,
    ry,
    style: {
      transformBox: "fill-box",
      transformOrigin: "center",
      transform: `rotate(${Math.round(Math.random() * 360)}deg)`,
      transitionDuration: `${duration}ms`,
      transitionProperty: "all",
      transitionTimingFunction: initialized ? "ease-in-out" : "ease-out",
      opacity: config.opacityMin + Math.random() * (config.opacityMax - config.opacityMin),
    },
  }

  return {
    ellipsis,
    duration,
  }
}

export const useLoginArtifact = (config: LoginPhysics, parentSize: ParentSize) => {
  const refInitialized = useRef(false)
  const duration = useMemo(
    () =>
      roundDecimal(
        config.durationMin + Math.random() * (config.durationMax - config.durationMin),
        2
      ),
    [config.durationMax, config.durationMin]
  )

  const [characteristics, setCharacteristics] = useState<ArtifactCharacteristics>(
    generateCharacteristics(config, parentSize, duration, refInitialized.current)
  )

  useEffect(() => {
    const udpate = () => {
      setCharacteristics(
        generateCharacteristics(config, parentSize, duration, refInitialized.current)
      )
      refInitialized.current = true
    }

    const interval = setInterval(udpate, duration)

    // change after 100ms to ensure the first render has occured
    setTimeout(() => udpate(), 100)

    return () => {
      clearInterval(interval)
    }
  }, [config, duration, parentSize])

  return characteristics
}
