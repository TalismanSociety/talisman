import { CheckCircleIcon, LoaderIcon, XCircleIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { LedgerStatus } from "@ui/hooks/ledger/common"
import { FC, ReactNode, useEffect, useState } from "react"

export type LedgerConnectionStatusProps = {
  status: LedgerStatus
  message: string
  requiresManualRetry?: boolean
  hideOnSuccess?: boolean
  className?: string
  refresh: () => void
}

const wrapStrong = (text: string) => {
  if (!text) return text

  const splitter = new RegExp("(<strong>[^<]*?</strong>)", "g")
  const extractor = new RegExp("^<strong>([^<]*?)</strong>$", "g")

  return text.split(splitter).map((str, i) => {
    const match = extractor.exec(str)
    return match ? (
      <strong key={i} className="text-grey-300 p-0 capitalize">
        {match[1]}
      </strong>
    ) : (
      <span key={i}>{str}</span>
    )
  })
}

const Container: FC<{ className?: string; onClick?: () => void; children?: ReactNode }> = ({
  className,
  onClick,
  children,
}) => {
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={className}>
        {children}
      </button>
    )
  else return <div className={className}>{children}</div>
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
    <Container
      className={classNames(
        "text-body-secondary bg-grey-850 flex h-28 w-full items-center gap-4 rounded-sm p-8",
        hide && "invisible",
        requiresManualRetry && "hover:bg-grey-800",
        className
      )}
      onClick={requiresManualRetry ? refresh : undefined}
    >
      {status === "ready" && (
        <CheckCircleIcon className="text-alert-success min-w-[1em] shrink-0 text-[2rem]" />
      )}
      {status === "warning" && (
        <XCircleIcon className="text-alert-warn min-w-[1em] shrink-0 text-[2rem]" />
      )}
      {status === "error" && (
        <XCircleIcon className="text-alert-error min-w-[1em] shrink-0 text-[2rem]" />
      )}
      {status === "connecting" && (
        <LoaderIcon className="animate-spin-slow min-w-[1em] shrink-0 text-[2rem] text-white" />
      )}
      <div className="text-left leading-[2rem]">{wrapStrong(message)}</div>
    </Container>
  )
}
