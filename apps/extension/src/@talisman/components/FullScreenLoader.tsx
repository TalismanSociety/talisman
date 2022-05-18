import { FC, useEffect, useState } from "react"
import styled from "styled-components"
import StatusIcon from "./StatusIcon"

const LoaderContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  width: 100vw;
  opacity: 0;
  transition: opacity var(--transition-speed) ease-in;
  &.show {
    opacity: 1;
  }
`

export const FullScreenLoader: FC<{ spin?: boolean; title?: string; subtitle?: string }> = ({
  spin = false,
  title,
  subtitle,
}) => {
  const [className, setClassName] = useState<string>()

  // Fades in so in case the app loads fast, the loader doesn't appear
  useEffect(() => {
    setClassName("show")
  }, [])

  return (
    <LoaderContainer className={className}>
      <StatusIcon status={spin ? "SPINNING" : "STATIC"} title={title} subtitle={subtitle} />
    </LoaderContainer>
  )
}
