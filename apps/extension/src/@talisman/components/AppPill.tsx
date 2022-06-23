import { FC, useMemo } from "react"
import styled from "styled-components"
import Pill from "@talisman/components/Pill"
import Favicon from "@talisman/components/Favicon"
import * as Sentry from "@sentry/browser"
import { WithTooltip } from "./Tooltip"

const Container = styled(Pill)`
  margin: 0 1.2rem;
  background: var(--color-background-muted-3x);
  padding: 0.4rem 0.8rem;
  border-radius: 4.8rem;
  font-weight: var(--font-weight-regular);
  color: var(--color-mid);
  gap: 0.4rem;
  font-size: var(--font-size-small);
  max-width: 22rem;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  > span {
    margin: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
`

const AppIcon = styled(Favicon)`
  line-height: 1;

  &,
  img {
    height: 2rem;
    width: 2rem;
  }

  img {
    position: initial;
    top: initial;
    left: initial;
    border-radius: 50%;
  }
`

type Props = {
  url?: string
}

export const AppPill: FC<Props> = ({ url }) => {
  const host = useMemo(() => {
    try {
      if (!url) return null
      const typedUrl = new URL(url)
      return typedUrl.hostname
    } catch (err) {
      Sentry.captureException(err)
      return null
    }
  }, [url])

  if (!url || !host) return null

  return (
    <WithTooltip tooltip={url}>
      <Container>
        <AppIcon small url={url} />
        <span>{host} </span>
      </Container>
    </WithTooltip>
  )
}
