import { AlertCircleIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { EvmMessageScan } from "@ui/domains/Ethereum/useScanEvmMessage"
import { EvmTransactionScan } from "@ui/domains/Ethereum/useScanEvmTransaction"
import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

const ErrorDisplay: FC<{ title?: string; message?: string }> = ({ title, message }) => (
  <div
    className={classNames(
      "leading-paragraph flex w-full gap-8 rounded p-4",
      "bg-alert-warn/10",
      "text-alert-warn"
    )}
  >
    <div>
      <div className={classNames("rounded-full p-4", "bg-alert-warn/10")}>
        <AlertCircleIcon className="h-12 w-12" />
      </div>
    </div>
    <div className="flex w-full grow flex-col justify-center gap-1">
      <div className="font-bold">{title}</div>
      <div className="text-body-secondary ">{message}</div>
    </div>
  </div>
)

const getErrorText = (error: unknown) => {
  if (error instanceof Error) {
    return error.message
  }
  return error?.toString()
}

export const RiskAnalysisError: FC<{ scan: EvmMessageScan | EvmTransactionScan }> = ({ scan }) => {
  const { t } = useTranslation()

  const { title, message } = useMemo(() => {
    if (scan.error)
      return {
        title: t("Simulation failed"),
        message: getErrorText(scan.error) ?? t("Unknown error"),
      }

    if (scan.type === "message" && scan.result?.simulationResults?.error)
      return {
        title: t("Simulation failed"),
        message: scan.result.simulationResults.error.humanReadableError,
      }

    if (scan.type === "transaction" && scan.result?.simulationResults.aggregated.error)
      return {
        title: t("Simulation failed"),
        message: scan.result.simulationResults.aggregated.error.humanReadableError,
      }

    return {}
  }, [scan, t])

  if (!title || !message) return null

  return <ErrorDisplay title={title} message={message} />
}
