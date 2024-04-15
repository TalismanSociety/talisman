import { EvmTransactionScan } from "@ui/domains/Ethereum/useScanEvmTransaction"
import { FC } from "react"
import { useTranslation } from "react-i18next"
import { Button, Checkbox, Drawer } from "talisman-ui"

import { useEthSignTransactionRequest } from "../../SignRequestContext"
import { RiskAnalysisRecommendation } from "./RiskAnalysisRecommendation"
import { RiskAnalysisStateChanges } from "./RiskAnalysisStateChanges"
import { RiskAnalysisWarnings } from "./RiskAnalysisWarnings"
import { EvmTransactionRiskAnalysis } from "./useRiskAnalysis"

const RiskAnalysisDrawerContent: FC<{
  scan: EvmTransactionScan
  riskAnalysis: EvmTransactionRiskAnalysis
}> = ({ scan, riskAnalysis }) => {
  const { t } = useTranslation()

  if (!scan?.isAvailable) return null

  // TODO
  if (scan.isValidating) return <div>Validating...</div>

  if (!scan.result) return <div>Result not available</div>
  if (!scan.chainInfo) return <div>Chain information not available</div>

  return (
    <div className="bg-grey-850 flex h-[60rem] w-full flex-col gap-12 p-12">
      <div className="scrollable scrollable-700  flex-grow overflow-y-auto pr-4 text-sm leading-[2rem] ">
        <div className="text-body-secondary leading-paragraph flex w-full flex-col gap-12 text-xs">
          <div className="text-body text-md text-center font-bold">{t("Risk Assessment")}</div>
          <RiskAnalysisRecommendation {...scan} />
          {scan.result && (
            <RiskAnalysisStateChanges scan={scan.result} chainInfo={scan.chainInfo} />
          )}
          <RiskAnalysisWarnings warnings={scan.result.warnings} />
        </div>
        {/* <BlowfishUIProvider
          mode="dark"
          fontFamily={`Surt, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", sans-serif`}
          themeOverride={{
            colors: {
              // backgroundPrimary: "#121212",
              // backgroundSecondary: "1B1B1B",
              // base10: "#fafafa",
              // base30: "#d4d4d4",
              // base40: "#a5a5a5",
              // base50: "#717171",
              // base75: "#2f2f2f",
              // base100: "#181818",
              // base10: "#fafafa",
              // base30: "#d4d4d4",
              // base40: "#a5a5a5",
              // base50: "#717171",
              // base75: "#2f2f2f",
              // base100: "#181818",

              danger: "#fd4848",
              success: "#38d448",
              warning: "#f48f45",
            },
            // severityColors: {
            //   CRITICAL: {
            //     background: "#fd4848",
            //     backgroundLight: "",
            //     backgroundV2: "#fd4848",
            //   },
            //   WARNING: {
            //     background: "#f48f45",
            //     backgroundLight: "",
            //     backgroundV2: "#f48f45",
            //   },
            //   INFO: {
            //     background: "#38d448",
            //     backgroundLight: "",
            //     backgroundV2: "#38d448",
            //   },
            // },
          }}
        >
          <hr />
          <StateChangePreviewEvm
            sectionLabel={"Expected state changes"}
            scanResult={validation.result}
            {...validation.chainInfo}
          />
          <div className="mt-6">Risk assesment </div>
          <div>Recommended action : {validation.result.action}</div>
          <div className="w-full">
            {validation.result.warnings.map((warning) => (
              <SimulationWarning key={warning.message} warning={warning} />
            ))}
          </div>
        </BlowfishUIProvider> */}
      </div>
      <div className="flex w-full items-center justify-between">
        <div>{t("I aknowledge the risks")}</div>
        <div>
          <Checkbox
            onChange={(e) => {
              riskAnalysis.setIsRiskAknowledged(e.target.checked)
            }}
          />
        </div>
      </div>
      <div>
        <Button onClick={riskAnalysis.riskAnalysisDrawer.close} className="w-full">
          {t("Close")}
        </Button>
      </div>
    </div>
  )
}

export const RiskAnalysisDrawer = () => {
  const { validation, riskAnalysis } = useEthSignTransactionRequest()

  return (
    <Drawer
      anchor="bottom"
      containerId="main"
      isOpen={riskAnalysis.riskAnalysisDrawer.isOpen}
      onDismiss={riskAnalysis.riskAnalysisDrawer.close}
    >
      <RiskAnalysisDrawerContent scan={validation} riskAnalysis={riskAnalysis} />
    </Drawer>
  )
}
