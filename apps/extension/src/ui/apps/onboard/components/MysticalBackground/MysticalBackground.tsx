import { useWindowHovered } from "@ui/hooks/useWindowHovered"
import { useMemo, useRef } from "react"
import { useMeasure, useMouse } from "react-use"
import styled from "styled-components"

import { CelestialArtifact } from "./CelestialArtifact"
import { DARK_PACT } from "./DarkPact"

const Universe = styled.div`
  filter: blur(${DARK_PACT.blur}px);
`

const CosmicRadar = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
`

export const MysticalBackground = ({ className }: { className?: string }) => {
  const [refSize, { width, height }] = useMeasure<HTMLDivElement>()
  const refMouseLocation = useRef<HTMLDivElement>(null)
  const { elX, elY, elW, elH } = useMouse(refMouseLocation)

  const parentSize = useMemo(
    () =>
      width && height
        ? {
            width,
            height,
          }
        : undefined,
    [height, width]
  )

  // useMouse doesn't detect if cursor goes out of the screen, so we also need to check for window hovering
  const windowHovered = useWindowHovered()

  const trackerProps = useMemo(
    () =>
      windowHovered && !!elX && !!elY && elX > 0 && elX < elW && elY > 0 && elY < elH
        ? { cx: elX, cy: elY, isTracker: true }
        : {},
    [elH, elW, elX, elY, windowHovered]
  )

  return (
    <Universe ref={refSize} className={className}>
      <CosmicRadar ref={refMouseLocation}>
        {parentSize && (
          <>
            <CelestialArtifact parentSize={parentSize} />
            <CelestialArtifact parentSize={parentSize} />
            <CelestialArtifact parentSize={parentSize} />
            <CelestialArtifact parentSize={parentSize} {...trackerProps} />
          </>
        )}
      </CosmicRadar>
    </Universe>
  )
}
