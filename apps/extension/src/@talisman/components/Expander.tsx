// @ts-nocheck
import useBoolean from "@talisman/hooks/useBoolean"
import { hideScrollbarsStyle } from "@talisman/theme/styles"
import { ReactNode, useEffect, useState } from "react"
import styled from "styled-components"

import { ReactComponent as ChevronIcon } from "../theme/icons/chevron-down.svg"

interface IProps {
  title: string | ReactNode
  subtitle?: string
  info?: string | number
  className?: string
  children?: ReactNode
}

const defaultProps: IProps = {}

const ExpandaContent = ({ children, className }) => {
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => setIsMounted(true), [])

  return (
    <article className={className} data-is-mounted={isMounted}>
      {children}
    </article>
  )
}

const StyledExpandaContent = styled(ExpandaContent)`
  max-height: 100rem;
  height: auto;
  padding: var(--padding);
  overflow: hidden;
  opacity: 1;
  transition: all var(--transition-speed-slow) ease-in-out;
  overflow-y: scroll;

  &[data-is-mounted="false"] {
    max-height: 0;
    padding-top: 0;
    padding-bottom: 0;
    opacity: 0;
  }

  ${hideScrollbarsStyle}
`

const Expanda = ({ title, subtitle, info, className, children }: IProps) => {
  const [open, toggleOpen] = useBoolean(false)

  return (
    <section className={`grid ${className}`} data-open={open}>
      <button onClick={toggleOpen}>
        <span className="left">
          <span className="title">{title}</span>
          <span className="subtitle">{subtitle}</span>
        </span>
        <span className="right">
          <span className="info">{info}</span>
          <ChevronIcon className="caret" />
        </span>
      </button>
      {!!open && <StyledExpandaContent>{children}</StyledExpandaContent>}
    </section>
  )
}

Expanda.defaultProps = defaultProps

const StyledExpanda = styled(Expanda)`
  > button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--color-background-muted);
    padding: var(--padding-small);
    border-radius: var(--border-radius);
    cursor: pointer;

    > span {
      display: flex;
      align-items: center;
    }

    .title {
      font-size: var(--font-size-normal);
    }

    .subtitle {
      font-size: var(--font-size-small);
      color: var(--color-mid);
      margin-left: 1em;
    }

    .caret {
      margin-left: 1em;
      transition: transform var(--transition-speed-fast) ease-in-out;
      opacity: 0.5;
    }
  }

  &[data-open="false"] {
    > header {
      .caret {
        transform: rotate(-90deg);
      }
    }
  }
`

StyledExpanda.defaultProps = defaultProps

export default StyledExpanda
