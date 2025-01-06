import { CheckCircleIcon, LoaderIcon, XCircleIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useTranslation } from "react-i18next"

import { LedgerStatus } from "@ui/hooks/ledger/common"

export type LedgerConnectionStatusProps = {
  status: LedgerStatus
  message: string
  className?: string
  onRetryClick?: () => void
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
        "text-body-secondary bg-grey-850 flex h-28 w-full items-center gap-4 rounded-sm p-8",
        className,
      )}
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
      <div className="grow text-left leading-[2rem]">{wrapStrong(message)}</div>
      {!!onRetryClick && (
        <button
          type="button"
          onClick={onRetryClick}
          className="bg-grey-800 hover:bg-grey-750 text-body border-body-disabled hover:border-body-inactive h-20 rounded border px-8"
        >
          {t("Retry")}
        </button>
      )}
    </div>
  )
}
