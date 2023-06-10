import Color from "color"
import { SVGProps, useEffect, useMemo, useRef, useState } from "react"

import { MysticalPhysicsV3 } from "./MysticalPhysicsV3"

export type ParentSize = {
  width: number
  height: number
}

export type ArtifactCharacteristics = {
  ellipsis: SVGProps<SVGEllipseElement>
  duration: number
  color: string
}

const roundDecimal = (value: number, decimals: number) => {
  const mult = Math.pow(10, decimals)
  return Math.round(mult * value) / mult
}

const generateCharacteristics = (
  config: MysticalPhysicsV3,
  parentSize: ParentSize,
  duration: number,
  initialized: boolean,
  targetX: number,
  targetY: number
): ArtifactCharacteristics => {
  const color = Color.hsv(Math.random() * 360, 100, 100).hex()
  const maxSize = Math.min(parentSize.width, parentSize.height)
  const rx = roundDecimal(
    maxSize * (config.radiusMin + Math.random() * (config.radiusMax - config.radiusMin)),
    2
  )
  const ry = roundDecimal(rx * (1 - config.ellipsisRatio * Math.random()), 2)

  const forceTarget = !!targetX && !!targetY
  const cx = forceTarget ? targetX : roundDecimal(Math.random() * parentSize.width, 2)
  const cy = forceTarget
    ? targetY
    : roundDecimal(Math.random() * parentSize.height - Math.max(rx, ry) / 2, 2)

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
      transitionTimingFunction: !forceTarget && initialized ? "ease-in-out" : "ease-out",
      opacity: Number(
        (config.opacityMin + Math.random() * (config.opacityMax - config.opacityMin)).toFixed(2)
      ),
    },
  }

  return {
    ellipsis,
    duration,
    color,
  }
}

export const useCelestialArtifact = (
  config: MysticalPhysicsV3,
  parentSize: ParentSize,
  x = 0,
  y = 0
) => {
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
    generateCharacteristics(config, parentSize, duration, refInitialized.current, x, y)
  )

  const refTarget = useRef<[number, number]>([x, y])
  useEffect(() => {
    refTarget.current = [x, y]
  }, [x, y])

  useEffect(() => {
    const update = () => {
      setCharacteristics(
        generateCharacteristics(
          config,
          parentSize,
          duration,
          refInitialized.current,
          ...refTarget.current
        )
      )
      refInitialized.current = true
    }

    const interval = setInterval(update, duration)

    // change after 100ms to ensure the first render has occured
    setTimeout(() => update(), 100)

    return () => {
      clearInterval(interval)
    }
  }, [config, duration, parentSize])

  // acolyte must update it's position every 500ms
  const isAcolyte = useMemo(() => !!x && !!y, [x, y])
  useEffect(() => {
    if (!isAcolyte) return

    const update = () => {
      const [cx, cy] = refTarget.current
      setCharacteristics((prev) => ({
        ...prev,
        ellipsis: {
          ...prev.ellipsis,
          cx,
          cy,
        },
      }))
    }

    const interval = setInterval(update, 500)

    // change after 100ms to ensure the first render has occured
    setTimeout(() => update(), 100)

    return () => {
      clearInterval(interval)
    }
  }, [isAcolyte])

  return characteristics
}
