import Color from "color"
import { AnimationPlaybackControls, animate } from "framer-motion"
import { useCallback, useEffect, useMemo, useRef } from "react"

import { MysticalPhysicsV2 } from "./MysticalPhysicsV2"

export type ParentSize = {
  width: number
  height: number
}

export type ArtifactCharacteristics = {
  cx: number
  cy: number
  radius: number
  opacity: number
  color: string
}

type ArtifactAnimations = {
  cx?: AnimationPlaybackControls
  cy?: AnimationPlaybackControls
  radius?: AnimationPlaybackControls
  opacity?: AnimationPlaybackControls
  color?: AnimationPlaybackControls
}

const rotateColor = (color: string) => {
  const c = Color(color)
  return c.hsv(c.hue() + (90 % 360), 100, 100).hex()
}

const generateCharacteristics = (
  config: MysticalPhysicsV2,
  parentSize: ParentSize,
  isAcolyte = false,
  cx?: number,
  cy?: number
) => {
  const largerBound = Math.max(parentSize.width, parentSize.height)
  const sizeRatio =
    (isAcolyte ? config.minSizeAcolyte : config.minSizeArtifact) +
    Math.random() *
      (isAcolyte
        ? config.maxSizeAcolyte - config.minSizeAcolyte
        : config.maxSizeArtifact - config.minSizeArtifact)

  const radius = (sizeRatio * largerBound) / 2

  const color = Color.hsv(Math.random() * 360, 100, 100).hex()
  const opacity =
    (isAcolyte ? config.minOpacityAcolyte : config.minOpacityArtifact) +
    Math.random() *
      (isAcolyte
        ? config.maxOpacityAcolyte - config.minOpacityAcolyte
        : config.maxOpacityArtifact - config.minOpacityArtifact)

  const characteristics: ArtifactCharacteristics = {
    cx: isAcolyte && cx ? cx : Math.random() * parentSize.width,
    cy: isAcolyte && cy ? cy : Math.random() * parentSize.height,
    radius,
    opacity,
    color,
  }
  return characteristics
}

export const useCelestialArtifact = (
  config: MysticalPhysicsV2,
  parentSize: ParentSize,
  isAcolyte?: boolean,
  cx?: number,
  cy?: number
) => {
  const refAnimations = useRef<ArtifactAnimations>({})
  const refResult = useRef<ArtifactCharacteristics>(
    generateCharacteristics(config, parentSize, isAcolyte, cx, cy)
  )

  // keep acolyte info as ref to prevent change() to be retriggered when hovering
  const refAcolyte = useRef<{ isAcolyte?: boolean; cx?: number; cy?: number }>({
    isAcolyte,
    cx,
    cy,
  })
  useEffect(() => {
    refAcolyte.current.cx = cx
  }, [cx])
  useEffect(() => {
    refAcolyte.current.cy = cy
  }, [cy])
  useEffect(() => {
    refAcolyte.current.isAcolyte = isAcolyte
  }, [cy, isAcolyte])

  // transition is different for acolytes
  const transition = useMemo(
    () => ({
      ease: isAcolyte ? config.easeAcolyte : config.easeArtifact,
      duration: isAcolyte ? config.durationAcolyte : config.durationArtifact,
      stiffness: isAcolyte ? config.stiffnessAcolyte : config.stiffnessArtifact,
    }),
    [config, isAcolyte]
  )

  // sets one property
  const updateCharacteristic = useCallback(
    <P extends keyof ArtifactCharacteristics>(key: P, value: ArtifactCharacteristics[P]) => {
      refAnimations.current[key]?.stop()

      refAnimations.current[key] = animate(refResult.current[key], value, {
        ...transition,
        onUpdate: (val) => {
          refResult.current[key] = val
        },
      })
    },
    [transition]
  )

  // changes all properties with newly generated values
  const change = useCallback(() => {
    const { isAcolyte, cx, cy } = refAcolyte.current
    const target = generateCharacteristics(config, parentSize, isAcolyte, cx, cy)
    target.color = rotateColor(refResult.current.color)

    for (const key of Object.keys(target)) {
      const k = key as keyof ArtifactCharacteristics
      if (k) updateCharacteristic(k, target[k])
    }
  }, [config, parentSize, updateCharacteristic])

  // trigger change once in a while
  useEffect(() => {
    const interval = setInterval(change, config.durationArtifact * 1000)

    change()

    return () => {
      clearInterval(interval)
    }
  }, [change, config.durationArtifact])

  // follow mouse cursor
  useEffect(() => {
    if (cx && cy) {
      updateCharacteristic("cx", cx)
      updateCharacteristic("cy", cy)
    }
  }, [cx, cy, updateCharacteristic])

  return refResult.current
}
