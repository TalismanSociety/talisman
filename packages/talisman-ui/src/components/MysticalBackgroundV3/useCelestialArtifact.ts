import Color from "color"
import { CSSProperties, useCallback, useLayoutEffect, useMemo, useRef, useState } from "react"

import { MysticalPhysicsV3 } from "./MysticalPhysicsV3"

export type CelestialArtifactProps = {
  /** Configures the MysticalBackground parameters */
  config: MysticalPhysicsV3

  /** The size (in pixels) of the element we're rendering on */
  parentSize: ParentSize

  /** Is used to ensure a consistent z-order of artifacts, i.e. to avoid any flickering from artifacts competing to be on top */
  artifactIndex: number

  /** Forces the artifact to use this color, instead of a randomly selected one */
  color?: string
}

export const useCelestialArtifact = ({
  config,
  parentSize,
  artifactIndex,
  color,
}: CelestialArtifactProps) => {
  const duration = useMemo(
    () => Math.round(randBetween(config.durationMin, config.durationMax)),
    [config.durationMax, config.durationMin]
  )

  const refInitialized = useRef(false)
  const generate = useCallback(
    () =>
      generateArtifact({
        config,
        parentSize,
        artifactIndex,
        color,
        duration,
        initialized: refInitialized.current,
      }),
    [color, config, duration, artifactIndex, parentSize]
  )

  const [artifact, setArtifact] = useState(generate)
  useLayoutEffect(() => {
    let active = true
    const update = () => {
      if (!active) return

      setArtifact(generate())
      refInitialized.current = true

      setTimeout(update, duration)
    }

    // On mount, useState will have an initial position & size & color for the artifact.
    //
    // Then once that initial state has rendered (thanks to useLayoutEffect & setTimeout) we will
    // begin our first transition to the second position & size & color by calling `update` here.
    //
    // For this first transition, `initialized` will be `false` - so we will get a slightly different
    // transition timing function (ease-in-out instead of ease-out).
    //
    // After that, `update` will call itself every `duration` interval, up until we unmount and set `active` to false.
    setTimeout(update, 30)

    return () => {
      active = false
    }
  }, [generate, duration])

  return artifact
}

export type ParentSize = {
  width: number
  height: number
}

type GenerateArtifactProps = CelestialArtifactProps & {
  /** The duration between each artifact position, scale and color change */
  duration: number

  /** Whether or not the artifact has been initialized */
  initialized: boolean
}

const generateArtifact = ({
  config,
  parentSize,
  artifactIndex,
  color: forceColor,
  duration,
  initialized,
}: GenerateArtifactProps): CSSProperties => {
  const maxSize = Math.min(parentSize.width, parentSize.height) * 2
  const width = Math.round(maxSize * randBetween(config.radiusMin, config.radiusMax))
  const height = Math.round(width * (1 - config.ellipsisRatio * Math.random()))

  const x = Math.round(Math.random() * parentSize.width)
  const y = Math.round(Math.random() * parentSize.height)

  const color = forceColor ?? Color.hsv(Math.random() * 360, 100, 100).hex()
  const opacity = randBetween(config.opacityMin, config.opacityMax)
  const background = artifactBg(color, opacity)

  // This defines the base unit used in the `scale3d()` transform func.
  //
  // It sets the base `width` and `height` of the element, before scaling with `scale3d` to the desired `width` and `height`.
  //
  // Why are we using `scale3d` and not just animating the `width` and `height` properties?
  // Because `scale3d` can be GPU-accelerated, and changing it doesn't cause the browser to repaint the page on every frame.
  //
  // On chrome we can set this to `1px`, and then if we want a 500x500px circle we could do `scale3d(500, 500, 1)`.
  //
  // However, on firefox the radial-gradient background is computed *before* scaling the element.
  // So if we use `1px`, we'll have a radial-gradient scaled to `500px` in screen size but with the resolution of just one pixel!
  //
  // This would *not* be a very nice gradient to look at :^)
  //
  // So to fix this, we'll scale this value up a few orders of magnitude, to `1000px`.
  // And then for our 500x500px circle we need to use `scale3d(0.5, 0.5, 1)`.
  // Because `500` (the size we want) divided by `1000` (our base size, or backgroundResolution) is `0.5`.
  const backgroundResolution = 1000 // in pixels squared

  const tCenterOrigin = `translate3d(-50%, -50%, ${artifactIndex}px)`
  const tTranslate = `translate3d(${x}px, ${y}px, 0)`
  const tRotate = `rotateZ(${Math.round(Math.random() * 360)}deg)`
  const tScale = `scale3d(${width / backgroundResolution}, ${height / backgroundResolution}, 1)`
  const transform = `${tCenterOrigin} ${tTranslate} ${tRotate} ${tScale}`

  // NOTE: This transform can be handy for debugging the transition, because it keeps the
  // artifact non-rotated and in the center of the screen.
  // const transform = `${tCenterOrigin} translate3d(${parentSize.width / 2}px, ${
  //   parentSize.height / 2
  // }px, 0) ${tScale}`

  const ellipsis: CSSProperties = {
    position: "absolute",
    width: `${backgroundResolution}px`,
    height: `${backgroundResolution}px`,
    top: 0,
    left: 0,

    // The performant transition properties are `transform`, `opacity` and `filter`.
    // But the value of `transition-property` is set inside the <CelestialArtifact /> component, not here.
    // (It needs to be changed as part of the opacity transition).
    // transitionProperty: "transform",
    transitionDuration: `${duration}ms`,
    transitionTimingFunction: initialized ? "ease-in-out" : "ease-out",

    transformOrigin: "center",
    transform,

    background,
    borderRadius: "50%",
    userSelect: "none",
  }

  return ellipsis
}

const artifactBg = (color: string, opacity: number) => {
  // start from the randomly generated opacity for this element in the center
  //
  // we multiply the generated opacity by 0.9 for legacy reasons:
  // in the past we would set the opacity of the background startColor to 0.9,
  // and then also set the element's opacity the randomly generated opacity
  //
  // but now we just combine both opacities into the background startColor
  const startColor = Color(color)
    .alpha(0.9 * opacity)
    .hexa()

  // end as completely transparent at the edges
  const endColor = Color(color).alpha(0).hexa()

  return `radial-gradient(at center, ${startColor} 0%, ${endColor} 50%)`
}

const randBetween = (minimum: number, maximum: number) =>
  minimum + Math.random() * (maximum - minimum)
