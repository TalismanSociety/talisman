import { AnimationPlaybackControls, animate } from "framer-motion"
import { useCallback, useEffect, useMemo, useRef } from "react"

import { LoginPhysics } from "./LoginPhysics"

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

const generateCharacteristics = (config: LoginPhysics, parentSize: ParentSize, color: string) => {
  const radius = (Math.random() * Math.min(parentSize.width, parentSize.height)) / 2

  const opacity =
    config.minOpacityArtifact +
    Math.random() * (config.maxOpacityArtifact - config.minOpacityArtifact)

  const characteristics: ArtifactCharacteristics = {
    cx: Math.random() * parentSize.width,
    // don't let artifacts touch the bottom of the popup as popup height might be bigger than our canvas
    cy: Math.random() * parentSize.height * 0.8,
    radius,
    opacity,
    color,
  }
  return characteristics
}

export const useLoginArtifact = (config: LoginPhysics, parentSize: ParentSize, color: string) => {
  const refAnimations = useRef<ArtifactAnimations>({})
  const refResult = useRef<ArtifactCharacteristics>(
    generateCharacteristics(config, parentSize, color)
  )

  const transition = useMemo(
    () => ({
      duration: config.minDuration + Math.random() * (config.maxDuration - config.minDuration),
      stiffness: config.stiffnessArtifact,
    }),
    [config]
  )

  const refInitialized = useRef(false)

  const updateCharacteristic = useCallback(
    <P extends keyof ArtifactCharacteristics>(key: P, value: ArtifactCharacteristics[P]) => {
      if (refInitialized.current) refAnimations.current[key]?.stop()

      refAnimations.current[key] = animate(refResult.current[key], value, {
        ...transition,
        ease: refInitialized.current ? "easeInOut" : "easeOut", // on startup, no easeIn
        onUpdate: (val) => {
          refResult.current[key] = val
        },
      })

      refInitialized.current = true
    },
    [transition]
  )

  // changes all properties with newly generated values
  const change = useCallback(() => {
    const target = generateCharacteristics(config, parentSize, color)

    for (const key of Object.keys(target).filter((k) => k !== "color")) {
      const k = key as keyof ArtifactCharacteristics
      if (k) updateCharacteristic(k, target[k])
    }
  }, [color, config, parentSize, updateCharacteristic])

  // trigger change once in a while
  useEffect(() => {
    const interval = setInterval(change, transition.duration * 1000)

    change()

    return () => {
      clearInterval(interval)
    }
  }, [change, transition.duration])

  return refResult.current
}
