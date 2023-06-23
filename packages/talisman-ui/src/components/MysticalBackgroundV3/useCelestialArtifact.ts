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
  const rx = Math.round(
    maxSize * (config.radiusMin + Math.random() * (config.radiusMax - config.radiusMin))
  )
  const ry = Math.round(rx * (1 - config.ellipsisRatio * Math.random()))

  const forceTarget = !!targetX && !!targetY
  const cx = forceTarget ? targetX : Math.round(Math.random() * parentSize.width)
  const cy = forceTarget
    ? targetY
    : Math.round(Math.random() * parentSize.height - Math.max(rx, ry) / 2)

  const ellipsis: SVGProps<SVGEllipseElement> = {
    cx,
    cy,
    rx,
    ry,
    style: {
      transitionProperty: "all",
      transformBox: "fill-box",
      transformOrigin: "center",
      transform: `rotate(${Math.round(Math.random() * 360)}deg)`,
      transitionDuration: `${duration}ms`,
      transitionDelay: "100ms", // prevents flickering on FF
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
      Math.round(config.durationMin + Math.random() * (config.durationMax - config.durationMin)),
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
