import { CheckCircleIcon, LoaderIcon, XCircleIcon } from "@talisman/theme/icons"
import { classNames } from "@talisman/util/classNames"
import { LedgerStatus } from "@ui/hooks/ledger/common"
import { useEffect, useState } from "react"
import styled from "styled-components"

const Panel = styled.div<{ status?: string; onClick?: () => void; hide?: boolean }>`
  background: var(--color-background-muted);
  padding: 1.6rem;
  border-radius: var(--border-radius);
  color: var(--color-mid);
  display: flex;
  align-items: center;
  gap: 0.8rem;
  line-height: 1;
  svg {
    font-size: 2rem;
    min-width: 1em;
    line-height: 2rem;
    ${(props) =>
      props.status
        ? `color: var(--color-status-${props.status === "ready" ? "success" : props.status});`
        : ""};
  }
  span {
    line-height: 2rem !important;
  }
  height: 5.6rem;
  width: 100%;

  ${(props) =>
    props.onClick
      ? `
      :hover {
      cursor: pointer;
      background: var(--color-background-muted-3x);
      }
  `
      : ""}

  ${(props) =>
    props.hide
      ? `
        transition: opacity var(--transition-speed-xslower) ease-in-out;
        opacity: 0;
    `
      : ""}
`

export type LedgerConnectionStatusProps = {
  status: LedgerStatus
  message: string
  requiresManualRetry?: boolean
  hideOnSuccess?: boolean
  className?: string
  refresh: () => void
}

const Strong = styled.strong`
  color: var(--color-foreground-muted-2x);
  text-transform: capitalize;
`

const wrapStrong = (text: string) => {
  const splitter = new RegExp("(<strong>[^<]*?</strong>)", "g")
  const extractor = new RegExp("^<strong>([^<]*?)</strong>$", "g")

  return text.split(splitter).map((str, i) => {
    const match = extractor.exec(str)
    return match ? <Strong key={i}>{match[1]}</Strong> : <span key={i}>{str}</span>
  })
}

export const LedgerConnectionStatus = ({
  status,
  message,
  requiresManualRetry,
  hideOnSuccess = false,
  className,
  refresh,
}: LedgerConnectionStatusProps) => {
  const [hide, setHide] = useState<boolean>(false)

  useEffect(() => {
    if (status === "ready" && hideOnSuccess) setTimeout(() => setHide(true), 1000)
  }, [status, hideOnSuccess])

  if (!status || status === "unknown") return null
  return (
    <Panel
      className={classNames("ledger-connection", className)}
      status={status}
      onClick={requiresManualRetry ? refresh : undefined}
      {...{ hide }}
    >
      {status === "ready" && <CheckCircleIcon />}
      {status === "warning" && <XCircleIcon />}
      {status === "error" && <XCircleIcon />}
      {status === "connecting" && <LoaderIcon className="animate-spin-slow text-white" />}
      <span>{wrapStrong(message)}</span>
    </Panel>
  )
}
