import { useState, useEffect } from "react"
import styled from "styled-components"
import Button from "../Button"
import { ReactComponent as IconCheck } from "@talisman/theme/icons/check-circle.svg"
import { ReactComponent as IconAlert } from "@talisman/theme/icons/alert-circle.svg"
import { ReactComponent as IconLoader } from "@talisman/theme/icons/loader.svg"
import { ReactComponent as IconXCircle } from "@talisman/theme/icons/x-circle.svg"

interface IIconProps {
  type?: string
  className?: string
}

const Icon = ({ type, className }: IIconProps) => {
  const [icon, setIcon] = useState<any>(null)

  useEffect(() => {
    switch (type) {
      case "PROCESSING":
        setIcon(<IconLoader data-spin className={`icon ${className}`} />)
        break
      case "SUCCESS":
        setIcon(<IconCheck className={`icon ${className}`} />)
        break
      case "ERROR":
        setIcon(<IconXCircle className={`icon ${className}`} />)
        break
      case "WARN":
        setIcon(<IconAlert className={`icon ${className}`} />)
        break
      default:
        setIcon(null)
        break
    }
  }, [type, className])

  return icon
}

export interface IItemProps {
  id: string
  title?: string
  subtitle?: string
  nav?: [] | null
  status?: string
  type: string
  close?: () => void
  className?: string
}

const Item = ({ title, subtitle, nav, status, type, close, className }: IItemProps) => {
  const [state, setState] = useState("INIT")

  useEffect(() => {
    !!status && setState(status)
  }, [status])

  return (
    <div className={`notification-item ${className}`} data-state={state} onClick={close}>
      {!!title && <Icon type={type} />}
      <span className="notification-content">
        {!!title && <div className="title">{title}</div>}
        {!!subtitle && <div className="subtitle">{subtitle}</div>}
        {!!nav?.length && (
          <nav className="nav">
            {nav.map((item: any) => (
              <Button small {...item}>
                {item.title}
              </Button>
            ))}
          </nav>
        )}
      </span>
    </div>
  )
}

const StyledItem = styled(Item)`
  transition: all 0.2s ease-in-out;
  padding: var(--padding-small);
  background: var(--color-background-muted);
  line-height: 1em;
  width: 30rem;
  opacity: 1;
  transform: translateX(0);
  height: auto;
  max-height: 20rem;
  overflow: hidden;
  border-radius: var(--border-radius);
  cursor: pointer;

  display: flex;
  align-items: center;
  gap: 1.5rem;

  .icon {
    width: 3rem;
    height: auto;
  }

  .notification-content {
    > .title {
      color: var(--color-foreground);
    }

    > .subtitle {
      margin-top: 0.25rem;
      font-size: var(--font-size-small);
      color: var(--color-mid);
    }

    > .nav {
      margin-top: 1rem;
      .button {
        padding: 0.3em 0.8em;
      }
    }
  }

  &[data-state="INIT"] {
    opacity: 0;
    transform: translateX(100%);
  }

  &[data-state="OPEN"] {
    opacity: 1;
    transform: translateX(0);
  }

  &[data-state="CLOSED"] {
    opacity: 0;
    max-height: 0;
    transform: translateX(0);
    padding: 0;
    margin: 0 !important;
  }

  ${({ type }) => type === "PROCESSING" && `color: var(--color-status-default)`};
  ${({ type }) => type === "SUCCESS" && `color: var(--color-status-success)`};
  ${({ type }) => type === "ERROR" && `color: var(--color-status-error)`};
  ${({ type }) => type === "WARN" && `color: var(--color-status-warning)`};
`

export default StyledItem
