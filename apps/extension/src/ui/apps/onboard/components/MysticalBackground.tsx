import Color from "color"
import { TargetAndTransition, Transition, motion } from "framer-motion"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useMeasure, useMouse } from "react-use"
import styled from "styled-components"

type Size = {
  width: number
  height: number
}

const getRandomCircleStyle = (parentSize: Size, cx?: number, cy?: number) => {
  const hasLocation = !!cx && !!cy

  const largerBound = Math.max(parentSize.width, parentSize.height)

  const size = Math.round(Math.random() * largerBound * (hasLocation ? 1 : 3))
  const color = Color.hsv(Math.random() * 360, 100, 100).hex()
  const top = (hasLocation ? cy : Math.round(Math.random() * parentSize.height)) - size / 2
  const left = (hasLocation ? cx : Math.round(Math.random() * parentSize.width)) - size / 2
  const opacity = Math.random() / (hasLocation ? 3 : 10)

  const target: TargetAndTransition = {
    width: size,
    height: size,
    background: `radial-gradient(circle at center, ${color} 0, transparent 50%)`,
    top,
    left,
    opacity,

    transition: {
      ease: hasLocation ? "easeOut" : "easeInOut",
      duration: hasLocation ? 6 : 8,
      stiffness: 500,
    },
  }

  return target
}

const ItemBase = styled(motion.div)`
  position: absolute;
  width: 1em;
  height: 1em;
`

const transition: Transition = { ease: "easeInOut", duration: 8, stiffness: 500 }

type CelestialArtifactProps = {
  parentSize: Size
  cx?: number
  cy?: number
}

const CelestialArtifact = ({ parentSize, cx, cy }: CelestialArtifactProps) => {
  const [target, setTarget] = useState<TargetAndTransition>(() =>
    getRandomCircleStyle(parentSize, cx, cy)
  )

  const change = useCallback(() => {
    setTarget(getRandomCircleStyle(parentSize, cx, cy))
  }, [cx, cy, parentSize])

  useEffect(() => {
    const interval = setInterval(change, transition.duration * 1000)

    change()

    return () => {
      clearInterval(interval)
    }
  }, [change])

  return <ItemBase initial={false} animate={target}></ItemBase>
}

const Container = styled.div`
  z-index: 1;
`

const MousePad = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
`
const Filter = styled.div`
  z-index: 1;
  filter: blur(50px);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
`

export const MysticalBackground = ({ className }: { className?: string }) => {
  const [refSize, { width, height }] = useMeasure<HTMLDivElement>()
  const refMouse = useRef<HTMLDivElement>(null)
  const { elX, elY } = useMouse(refMouse)

  const parentSize: Size | undefined = useMemo(
    () =>
      width && height
        ? {
            width,
            height,
          }
        : undefined,
    [height, width]
  )

  return (
    <Container ref={refSize} className={className}>
      <MousePad ref={refMouse}>
        {parentSize && (
          <>
            <CelestialArtifact parentSize={parentSize} />
            <CelestialArtifact parentSize={parentSize} />
            <CelestialArtifact parentSize={parentSize} />
            <CelestialArtifact parentSize={parentSize} cx={elX} cy={elY} />
          </>
        )}
        {/* <Filter /> */}
      </MousePad>
    </Container>
  )
}
