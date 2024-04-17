import { EvmMessageScan } from "@ui/domains/Ethereum/useScanEvmMessage"
import { EvmTransactionScan } from "@ui/domains/Ethereum/useScanEvmTransaction"
import { FC } from "react"
import { useTranslation } from "react-i18next"
import { Button, Drawer } from "talisman-ui"

import { useEthSignMessageRequest, useEthSignTransactionRequest } from "../../SignRequestContext"
import { RiskAnalysisRecommendation } from "./RiskAnalysisRecommendation"
import { RiskAnalysisStateChanges } from "./RiskAnalysisStateChanges"
import { RiskAnalysisWarnings } from "./RiskAnalysisWarnings"
import { RisksAnalysisAknowledgement } from "./RisksAnalysisAknowledgement"
import { RisksReview } from "./useRisksReview"

const RiskAnalysisDrawerContent: FC<{
  scan: EvmTransactionScan | EvmMessageScan
  risksReview: RisksReview
}> = ({ scan, risksReview }) => {
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
          <RiskAnalysisRecommendation scan={scan} />
          {scan.type === "transaction" && <RiskAnalysisStateChanges scan={scan} />}
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
      <RisksAnalysisAknowledgement risksReview={risksReview} />
      <div>
        <Button onClick={risksReview.drawer.close} className="w-full">
          {t("Close")}
        </Button>
      </div>
    </div>
  )
}

const RiskAnalysisDrawer: FC<{
  scan: EvmTransactionScan | EvmMessageScan
  risksReview: RisksReview
}> = ({ scan, risksReview }) => {
  return (
    <Drawer
      anchor="bottom"
      containerId="main"
      isOpen={risksReview.drawer.isOpen}
      onDismiss={risksReview.drawer.close}
    >
      <RiskAnalysisDrawerContent scan={scan} risksReview={risksReview} />
    </Drawer>
  )
}

export const RisksAnalysisTxDrawer = () => {
  const { scan, risksReview } = useEthSignTransactionRequest()
  return <RiskAnalysisDrawer scan={scan} risksReview={risksReview} />
}

export const RisksAnalysisMsgDrawer = () => {
  const { scan, risksReview } = useEthSignMessageRequest()
  return <RiskAnalysisDrawer scan={scan} risksReview={risksReview} />
}
