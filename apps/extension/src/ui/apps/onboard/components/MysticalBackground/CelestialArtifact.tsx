import Color from "color"
import { TargetAndTransition, motion } from "framer-motion"
import { useCallback, useEffect, useState } from "react"
import styled from "styled-components"

import { MYSTICAL_PHYSICS } from "./MysticalPhysics"

type Size = {
  width: number
  height: number
}

const getBackgroundGradient = (color: string) => {
  return `radial-gradient(circle at center, ${color} 0, transparent 50%)`
}

const rotateColor = (color: string) => {
  const c = Color(color)
  return c.hsv(c.hue() + (90 % 360), 100, 100).hex()
}

const generateCelestialTransform = (parentSize: Size, isAcolyte = false, cx = 0, cy = 0) => {
  const largerBound = Math.max(parentSize.width, parentSize.height)

  const size = Math.round(
    Math.random() *
      largerBound *
      (isAcolyte ? MYSTICAL_PHYSICS.sizeTracker : MYSTICAL_PHYSICS.sizeArtifact)
  )
  const color = Color.hsv(Math.random() * 360, 100, 100).hex()
  const top = (isAcolyte ? cy : Math.round(Math.random() * parentSize.height)) - size / 2
  const left = (isAcolyte ? cx : Math.round(Math.random() * parentSize.width)) - size / 2
  const opacity =
    (isAcolyte ? MYSTICAL_PHYSICS.minOpacityAcolyte : MYSTICAL_PHYSICS.minOpacityArtifact) +
    Math.random() *
      (isAcolyte ? MYSTICAL_PHYSICS.maxOpacityAcolyte : MYSTICAL_PHYSICS.maxOpacityArtifact)

  const target: TargetAndTransition = {
    width: size,
    height: size,
    background: getBackgroundGradient(color),
    top,
    left,
    opacity,
    color, // not used except as memory, for color rotation

    transition: {
      ease: isAcolyte ? MYSTICAL_PHYSICS.easeAcolyte : MYSTICAL_PHYSICS.easeArtifact,
      duration: isAcolyte ? MYSTICAL_PHYSICS.durationAcolyte : MYSTICAL_PHYSICS.durationArtifact,
      stiffness: isAcolyte ? MYSTICAL_PHYSICS.stiffnessAcolyte : MYSTICAL_PHYSICS.stiffnessArtifact,
    },
  }

  return target
}

const CelestialArtifactBase = styled(motion.div)`
  position: absolute;
`

type CelestialArtifactProps = {
  parentSize: Size
  isAcolyte?: boolean
  cx?: number
  cy?: number
}

export const CelestialArtifact = ({ parentSize, isAcolyte, cx, cy }: CelestialArtifactProps) => {
  const [target, setTarget] = useState<TargetAndTransition>(() =>
    generateCelestialTransform(parentSize, isAcolyte, cx, cy)
  )

  const change = useCallback(() => {
    setTarget((prev) => ({
      // generate new characteristics
      ...generateCelestialTransform(parentSize, isAcolyte, cx, cy),

      // derive new color from previous one to ensure nice color matchs
      color: rotateColor(prev.color as string),
      background: getBackgroundGradient(rotateColor(prev.color as string)),
    }))
  }, [parentSize, isAcolyte, cx, cy])

  // follow mouse cursor
  useEffect(() => {
    if (isAcolyte && !!cx && !!cy)
      setTarget((prev) => ({
        // keep previous state
        ...prev,
        // update coordinates to mouse cursor
        top: cx - ((prev.height as number) || 0) / 2,
        left: cy - ((prev.width as number) || 0) / 2,
      }))
  }, [isAcolyte, cx, cy])

  useEffect(() => {
    const interval = setInterval(change, MYSTICAL_PHYSICS.durationArtifact * 1000)

    change()

    return () => {
      clearInterval(interval)
    }
  }, [change])

  return <CelestialArtifactBase initial={false} animate={target} />
}
