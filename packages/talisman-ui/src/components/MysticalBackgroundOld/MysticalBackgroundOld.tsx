import { useMemo, useRef } from "react"
import { useMeasure, useMouse } from "react-use"
import styled from "styled-components"

import { useWindowHovered } from "../MysticalBackground/useWindowHovered"
import { CelestialArtifact } from "./CelestialArtifact"
import { MYSTICAL_PHYSICS } from "./MysticalPhysics"

const Universe = styled.div`
  filter: blur(${MYSTICAL_PHYSICS.blur}px);
`

const CosmicRadar = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
`

// still beeing used in playground to compare with new version
export const MysticalBackgroundOld = ({ className }: { className?: string }) => {
  const [refSize, parentSize] = useMeasure<HTMLDivElement>()
  const refMouseLocation = useRef<HTMLDivElement>(null)
  const { elX, elY, elW, elH } = useMouse(refMouseLocation)

  // useMouse doesn't detect if cursor goes out of the screen, so we also need to check for window hovering
  const isWindowHovered = useWindowHovered()

  // props for the artifact that follows mouse cursor
  const acolyte = useMemo(
    () =>
      isWindowHovered && !!elX && !!elY && elX > 0 && elX < elW && elY > 0 && elY < elH
        ? { cx: elX, cy: elY, isAcolyte: true }
        : {},
    [elH, elW, elX, elY, isWindowHovered]
  )

  return (
    <Universe ref={refSize} className={className}>
      <CosmicRadar ref={refMouseLocation}>
        {parentSize?.width && parentSize?.height && (
          <>
            <CelestialArtifact parentSize={parentSize} />
            <CelestialArtifact parentSize={parentSize} />
            <CelestialArtifact parentSize={parentSize} {...acolyte} />
          </>
        )}
      </CosmicRadar>
    </Universe>
  )
}
