import SPINNING from "@talisman/theme/images/hand_open_spin_animated_dark.gif"
import STATIC from "@talisman/theme/images/hand_open_static_dark.gif"
import ERROR from "@talisman/theme/images/hand_thumbs_down_animated_dark.gif"
import SUCCESS from "@talisman/theme/images/hand_thumbs_up_animated_dark.gif"
import { ReactNode } from "react"
import styled from "styled-components"

const iconTypes = {
  STATIC,
  SPINNING,
  EXPLODING: <span>exploding</span>,
  SUCCESS,
  ERROR,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as { [status: string]: any }

export type StatusIconStatus = "STATIC" | "SPINNING" | "EXPLODING" | "SUCCESS" | "ERROR"

interface IProps {
  status?: StatusIconStatus
  title?: string
  subtitle?: ReactNode
  className?: string
}

export const StatusIcon = ({ status = "STATIC" }: { status?: StatusIconStatus }) => (
  <img
    src={iconTypes[status]}
    alt={`icon todo: ${status.toLowerCase()}`}
    className="my-0 mx-auto block w-[22rem]"
  />
)

const UnstyledStatusIconWithTitle = ({ status = "STATIC", title, subtitle, className }: IProps) => (
  <section className={className}>
    <StatusIcon status={status} />
    {title && <h1>{title}</h1>}
    {subtitle && <h2>{subtitle}</h2>}
  </section>
)

const StatusIconWithTitle = styled(UnstyledStatusIconWithTitle)`
  text-align: center;

  h1 {
    font-size: var(--font-size-medium);
    font-weight: bold;
    margin: 0;
    margin-top: -1rem;
  }

  h2 {
    font-size: var(--font-size-small);
    margin-top: 0.2em;
    color: var(--color-background-muted-2x);
  }
`

export default StatusIconWithTitle
