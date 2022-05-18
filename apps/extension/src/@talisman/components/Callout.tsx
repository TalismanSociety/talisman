import React, { PropsWithChildren } from "react"
import styled from "styled-components"

type TProps = PropsWithChildren<{
  className?: string
}>

const Callout = ({ className, children }: TProps) => (
  <div className={`callout ${className}`}>{children}</div>
)

const StyledCallout = styled(Callout)`
  font-size: var(--font-size-normal);
  padding: var(--padding-small);
  background: var(--color-status-default);
  border-radius: var(--border-radius);
  background: var(--color-background);
`

export default StyledCallout
