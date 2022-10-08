import Color from "color"
import { animate, AnimationPlaybackControls } from "framer-motion"

import { useCallback, useEffect, useMemo, useRef } from "react"

import { MYSTICAL_PHYSICS } from "./MysticalPhysics"

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
  parentSize: ParentSize,
  isAcolyte = false,
  cx?: number,
  cy?: number
) => {
  const largerBound = Math.min(parentSize.width, parentSize.height)
  const sizeRatio =
    (isAcolyte ? MYSTICAL_PHYSICS.minSizeAcolyte : MYSTICAL_PHYSICS.minSizeArtifact) +
    Math.random() *
      (isAcolyte
        ? MYSTICAL_PHYSICS.maxSizeAcolyte - MYSTICAL_PHYSICS.minSizeAcolyte
        : MYSTICAL_PHYSICS.maxSizeArtifact - MYSTICAL_PHYSICS.minSizeArtifact)

  const radius = Math.round(sizeRatio * largerBound) / 2

  const color = Color.hsv(Math.random() * 360, 100, 100).hex()
  const opacity =
    (isAcolyte ? MYSTICAL_PHYSICS.minOpacityAcolyte : MYSTICAL_PHYSICS.minOpacityArtifact) +
    Math.random() *
      (isAcolyte
        ? MYSTICAL_PHYSICS.maxOpacityAcolyte - MYSTICAL_PHYSICS.minOpacityAcolyte
        : MYSTICAL_PHYSICS.maxOpacityArtifact - MYSTICAL_PHYSICS.minOpacityArtifact)

  const characteristics: ArtifactCharacteristics = {
    cx: isAcolyte && cx ? cx : Math.round(Math.random() * parentSize.width),
    cy: isAcolyte && cy ? cy : Math.round(Math.random() * parentSize.height),
    radius,
    opacity,
    color,
  }
  return characteristics
}

export const useCelestialArtifact = (
  parentSize: ParentSize,
  isAcolyte?: boolean,
  cx?: number,
  cy?: number
) => {
  const refAnimations = useRef<ArtifactAnimations>({})
  const refResult = useRef<ArtifactCharacteristics>(
    generateCharacteristics(parentSize, isAcolyte, cx, cy)
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
      ease: isAcolyte ? MYSTICAL_PHYSICS.easeAcolyte : MYSTICAL_PHYSICS.easeArtifact,
      duration: isAcolyte ? MYSTICAL_PHYSICS.durationAcolyte : MYSTICAL_PHYSICS.durationArtifact,
      stiffness: isAcolyte ? MYSTICAL_PHYSICS.stiffnessAcolyte : MYSTICAL_PHYSICS.stiffnessArtifact,
    }),
    [isAcolyte]
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
    const target = generateCharacteristics(parentSize, isAcolyte, cx, cy)
    target.color = rotateColor(refResult.current.color)

    for (const key of Object.keys(target)) {
      const k = key as keyof ArtifactCharacteristics
      if (k) updateCharacteristic(k, target[k])
    }
  }, [parentSize, updateCharacteristic])

  // trigger change once in a while
  useEffect(() => {
    const interval = setInterval(change, MYSTICAL_PHYSICS.durationArtifact * 1000)

    change()

    return () => {
      clearInterval(interval)
    }
  }, [change])

  // follow mouse cursor
  useEffect(() => {
    if (cx && cy) {
      updateCharacteristic("cx", cx)
      updateCharacteristic("cy", cy)
    }
  }, [cx, cy, updateCharacteristic])

  return refResult.current
}
