import Color from "color"
import { CSSProperties, useEffect, useMemo, useRef, useState } from "react"

import { MysticalPhysicsV3 } from "./MysticalPhysicsV3"

export type ParentSize = {
  width: number
  height: number
}

export type ArtifactCharacteristics = CSSProperties

const generateCharacteristics = (
  config: MysticalPhysicsV3,
  parentSize: ParentSize,
  duration: number,
  initialized: boolean,
  index: number,
  forceColor?: string
): ArtifactCharacteristics => {
  const color = forceColor ?? Color.hsv(Math.random() * 360, 100, 100).hex()
  const maxSize = Math.min(parentSize.width, parentSize.height) * 2

  const diameterMin = config.radiusMin // * 2
  const diameterMax = config.radiusMax // * 2

  const width = Math.round(maxSize * (diameterMin + Math.random() * (diameterMax - diameterMin)))
  const height = Math.round(width * (1 - config.ellipsisRatio * Math.random()))

  const top = Math.round(Math.random() * parentSize.height - Math.max(width / 2, height / 2) / 2)
  const left = Math.round(Math.random() * parentSize.width)

  const startColor = Color(color).alpha(0.9).hexa()
  const endColor = Color(color).alpha(0).hexa()

  // TODO: Render two ellipses, and transition `opacity` to go from the colour of one to the colour of the other :)

  const ellipsis: CSSProperties = {
    position: "absolute",
    width: "1px", //`${width}px`,
    height: "1px", // `${height}px`,
    top: 0,
    left: 0,
    // top: `${top}px`,
    // left: `${left}px`,
    // transitionProperty: "background transform",
    transitionProperty: "transform",
    // transitionProperty: "background position transform opacity",
    borderRadius: "100%",
    // maskImage: "radial-gradient(rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0) 90%)",
    // WebkitMaskImage: "radial-gradient(rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0) 90%)",
    background: `radial-gradient(${startColor} 0%, ${endColor} 90%)`,
    // background: color,
    // transformBox: "fill-box",
    transformOrigin: "center",
    transform: `translate3d(-50%, -50%, ${index}px) translate3d(${left}px, ${top}px, 0) scale3d(${width}, ${height}, 1) rotateZ(${Math.round(
      Math.random() * 360
    )}deg)`,
    transitionDuration: `${duration}ms`,
    // transitionDelay: "100ms", // prevents flickering on FF
    transitionTimingFunction: initialized ? "ease-in-out" : "ease-out",
    opacity: Number(
      (config.opacityMin + Math.random() * (config.opacityMax - config.opacityMin)).toFixed(2)
    ),
    userSelect: "none",
  }

  return ellipsis
}

export const useCelestialArtifact = (
  config: MysticalPhysicsV3,
  parentSize: ParentSize,
  index: number,
  color?: string
) => {
  const refInitialized = useRef(false)
  const duration = useMemo(
    () =>
      Math.round(config.durationMin + Math.random() * (config.durationMax - config.durationMin)),
    [config.durationMax, config.durationMin]
  )

  const [characteristics, setCharacteristics] = useState<ArtifactCharacteristics>(
    generateCharacteristics(config, parentSize, duration, refInitialized.current, index, color)
  )

  useEffect(() => {
    const update = () => {
      setCharacteristics(
        generateCharacteristics(config, parentSize, duration, refInitialized.current, index, color)
      )
      refInitialized.current = true
    }

    const interval = setInterval(update, duration)

    // change after 10ms to ensure the first render has occured
    setTimeout(() => update(), 10)

    return () => {
      clearInterval(interval)
    }
  }, [config, duration, parentSize, color, index])

  return characteristics
}
