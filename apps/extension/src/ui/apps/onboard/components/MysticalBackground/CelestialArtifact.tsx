import Color from "color"
import { TargetAndTransition, motion } from "framer-motion"
import { useCallback, useEffect, useState } from "react"
import styled from "styled-components"

import { DARK_PACT } from "./DarkPact"

type Size = {
  width: number
  height: number
}

const getRandomCircleStyle = (parentSize: Size, isTracker = false, cx = 0, cy = 0) => {
  const largerBound = Math.max(parentSize.width, parentSize.height)

  const size = Math.round(
    Math.random() * largerBound * (isTracker ? DARK_PACT.sizeTracker : DARK_PACT.sizeArtifact)
  )
  const color = Color.hsv(Math.random() * 360, 100, 100).hex()
  const top = (isTracker ? cy : Math.round(Math.random() * parentSize.height)) - size / 2
  const left = (isTracker ? cx : Math.round(Math.random() * parentSize.width)) - size / 2
  const opacity =
    Math.random() * (isTracker ? DARK_PACT.maxOpacityTracker : DARK_PACT.maxOpacityArtifact)

  const target: TargetAndTransition = {
    width: size,
    height: size,
    background: `radial-gradient(circle at center, ${color} 0, transparent 50%)`,
    top,
    left,
    opacity,

    transition: {
      ease: isTracker ? DARK_PACT.easeTracker : DARK_PACT.easeArtifact,
      duration: isTracker ? DARK_PACT.durationTracker : DARK_PACT.durationArtifact,
      stiffness: isTracker ? DARK_PACT.stiffnessTracker : DARK_PACT.stiffnessArtifact,
    },
  }

  return target
}

const CelestialArtifactBase = styled(motion.div)`
  position: absolute;
`

type CelestialArtifactProps = {
  parentSize: Size
}

export const CelestialArtifact = ({ parentSize }: CelestialArtifactProps) => {
  const [target, setTarget] = useState<TargetAndTransition>(() => getRandomCircleStyle(parentSize))

  const change = useCallback(() => {
    setTarget(getRandomCircleStyle(parentSize))
  }, [parentSize])

  useEffect(() => {
    const interval = setInterval(change, DARK_PACT.durationArtifact * 1000)

    change()

    return () => {
      clearInterval(interval)
    }
  }, [change])

  return <CelestialArtifactBase initial={false} animate={target}></CelestialArtifactBase>
}

type CelestialAcolyteProps = CelestialArtifactProps & {
  isTracker?: boolean
  cx?: number
  cy?: number
}

export const CelestialAcolyte = ({ parentSize, isTracker, cx, cy }: CelestialAcolyteProps) => {
  const [target, setTarget] = useState<TargetAndTransition>(() =>
    getRandomCircleStyle(parentSize, isTracker, cx, cy)
  )

  // changement total toutes les 8 secondes

  const change = useCallback(() => {
    setTarget(getRandomCircleStyle(parentSize, isTracker, cx, cy))
  }, [cx, cy, isTracker, parentSize])

  useEffect(() => {
    const interval = setInterval(change, DARK_PACT.durationArtifact * 1000)

    change()

    return () => {
      clearInterval(interval)
    }
  }, [change])

  return <CelestialArtifactBase initial={false} animate={target}></CelestialArtifactBase>
}
