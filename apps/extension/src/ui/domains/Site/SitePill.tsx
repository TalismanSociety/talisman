import { FC } from "react"
import styled from "styled-components"
import Pill from "@talisman/components/Pill"
import Favicon from "@talisman/components/Favicon"

const Container = styled(Pill)`
  background: var(--color-background-muted);
  padding: 0.8rem 1.2rem 0.8rem 0.8rem;
  border-radius: 4.8rem;
  font-weight: var(--font-weight-regular);
  color: var(--color-mid);
`

type Props = {
  title?: string
  favIconUrl?: string
}

export const SitePill: FC<Props> = ({ title, favIconUrl }) => {
  if (!title) return null
  return (
    <Container>
      {favIconUrl && <Favicon small url={favIconUrl} />}
      <span>{title}</span>
    </Container>
  )
}
