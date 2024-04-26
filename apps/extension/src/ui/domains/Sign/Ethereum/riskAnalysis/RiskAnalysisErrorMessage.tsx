import {
  EvmAggregatedSimulationResults,
  ScanMessageEvm200ResponseSimulationResultsError,
} from "@blowfishxyz/api-client/v20230605"
import { AlertCircleIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { TFunction } from "i18next"
import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { EvmRiskAnalysis } from "./types"

const getMessageErrorTitle = (
  kind: ScanMessageEvm200ResponseSimulationResultsError["kind"],
  t: TFunction
) => {
  switch (kind) {
    case "UNSUPPORTED_MESSAGE":
      return t("Unsupported message type")
    case "UNSUPPORTED_ORDER_TYPE":
      return t("Unsupported order type")
    case "UNKNOWN_ERROR":
      return t("Unknown analysis error")
  }
}

const getTransactionErrorTitle = (error: EvmAggregatedSimulationResults["error"], t: TFunction) => {
  if (!error) throw new Error("Missing error") // won't happen, typescript workaround
  switch (error.kind) {
    case "SIMULATION_FAILED":
      return t("Simulation failed")
    case "UNKNOWN_ERROR":
      return t("Unknown simulation error")
  }
}

const ErrorDisplay: FC<{ title?: string; message?: string }> = ({ title, message }) => (
  <div
    className={classNames("leading-paragraph flex w-full gap-8 rounded p-4", "bg-alert-warn/10")}
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

type RiskAnalysisError = { title: string; description: string }

export const getRiskAnalysisError = (
  riskAnalysis: EvmRiskAnalysis,
  t: TFunction
): RiskAnalysisError | null => {
  if (riskAnalysis.type === "message" && riskAnalysis.result?.simulationResults?.error)
    return {
      title: getMessageErrorTitle(riskAnalysis.result.simulationResults.error.kind, t),
      description: riskAnalysis.result.simulationResults.error.humanReadableError,
    }

  if (
    riskAnalysis.type === "transaction" &&
    riskAnalysis.result?.simulationResults.aggregated.error
  )
    return {
      title: getTransactionErrorTitle(riskAnalysis.result?.simulationResults.aggregated.error, t),
      description: riskAnalysis.result.simulationResults.aggregated.error.humanReadableError,
    }

  return null
}

export const RiskAnalysisError: FC<{
  riskAnalysis: EvmRiskAnalysis
}> = ({ riskAnalysis }) => {
  const { t } = useTranslation()

  const error = useMemo(() => {
    return getRiskAnalysisError(riskAnalysis, t)
    // if (riskAnalysis.error)
    //   return {
    //     title: t("Simulation failed"),
    //     message: getErrorText(riskAnalysis.error) ?? t("Unknown error"),
    //   }

    // if (riskAnalysis.type === "message" && riskAnalysis.result?.simulationResults?.error)
    //   return {
    //     title: getMessageErrorTitle(riskAnalysis.result.simulationResults.error.kind, t),
    //     message: riskAnalysis.result.simulationResults.error.humanReadableError,
    //   }

    // if (
    //   riskAnalysis.type === "transaction" &&
    //   riskAnalysis.result?.simulationResults.aggregated.error
    // )
    //   return {
    //     title: getTransactionErrorTitle(riskAnalysis.result?.simulationResults.aggregated.error, t),
    //     message: riskAnalysis.result.simulationResults.aggregated.error.humanReadableError,
    //   }

    // return {}
  }, [riskAnalysis, t])

  if (!error) return null

  return <ErrorDisplay title={error.title} message={error.description} />
}
