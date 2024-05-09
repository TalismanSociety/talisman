import {
  EvmAggregatedSimulationResults,
  ScanMessageEvm200ResponseSimulationResultsError,
} from "@blowfishxyz/api-client/v20230605"
import { TFunction } from "i18next"

import { PayloadType, ResponseType, RiskAnalysisScanError } from "./types"

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

export const getRiskAnalysisScanError = <T extends PayloadType>(
  type: T,
  response: ResponseType<T>,
  t: TFunction
): RiskAnalysisScanError | null => {
  switch (type) {
    case "message": {
      const r = response as ResponseType<"message">
      if (!r?.simulationResults?.error) return null

      return {
        title: getMessageErrorTitle(r.simulationResults.error.kind, t),
        description: t("Proceed at your own risk."),
      }
    }
    case "transaction": {
      const r = response as ResponseType<"transaction">
      if (!r?.simulationResults?.aggregated.error) return null

      return {
        title: getTransactionErrorTitle(r.simulationResults.aggregated.error, t),
        description: t("Proceed at your own risk."),
      }
    }
    default:
      return null
  }
}
