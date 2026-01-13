import { CheckCircleIcon, LoaderIcon, XCircleIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import type { LedgerStatus } from "@ui/hooks/ledger/common"
import { useTranslation } from "react-i18next"

export type LedgerConnectionStatusProps = {
  status: LedgerStatus
  message: string
  className?: string
  onRetryClick?: () => void
}

const wrapStrong = (text: string) => {
  if (!text) return text

  const splitter = /(<strong>[^<]*?<\/strong>)/g
  const extractor = /^<strong>([^<]*?)<\/strong>$/g

  return text.split(splitter).map((str, i) => {
    const match = extractor.exec(str)
    return match ? (
      // biome-ignore lint/suspicious/noArrayIndexKey: static list
      <strong key={i} className="p-0 text-grey-300 capitalize">
        {match[1]}
      </strong>
    ) : (
      // biome-ignore lint/suspicious/noArrayIndexKey: static list
      <span key={i}>{str}</span>
    )
  })
}

export const LedgerConnectionStatus = ({
  status,
  message,
  className,
  onRetryClick,
}: LedgerConnectionStatusProps) => {
  const { t } = useTranslation()

  if (!status || status === "unknown") return null

  return (
    <div
      className={classNames(
        "flex h-28 w-full items-center gap-4 rounded-sm bg-grey-850 p-8 text-body-secondary",
        className
      )}
    >
      {status === "ready" && (
        <CheckCircleIcon className="min-w-[1em] shrink-0 text-[2rem] text-alert-success" />
      )}
      {status === "warning" && (
        <XCircleIcon className="min-w-[1em] shrink-0 text-[2rem] text-alert-warn" />
      )}
      {status === "error" && (
        <XCircleIcon className="min-w-[1em] shrink-0 text-[2rem] text-alert-error" />
      )}
      {status === "connecting" && (
        <LoaderIcon className="min-w-[1em] shrink-0 animate-spin-slow text-[2rem] text-white" />
      )}
      <div className="grow text-left leading-[2rem]">{wrapStrong(message)}</div>
      {!!onRetryClick && (
        <button
          type="button"
          onClick={onRetryClick}
          className="h-20 rounded border border-body-disabled bg-grey-800 px-8 text-body hover:border-body-inactive hover:bg-grey-750"
        >
          {t("Retry")}
        </button>
      )}
    </div>
  )
}
