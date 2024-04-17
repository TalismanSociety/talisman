import { EvmMessageScan } from "@ui/domains/Ethereum/useScanEvmMessage"
import { EvmTransactionScan } from "@ui/domains/Ethereum/useScanEvmTransaction"
import { FC } from "react"
import { useTranslation } from "react-i18next"
import { Button, Drawer } from "talisman-ui"

import { useEthSignMessageRequest, useEthSignTransactionRequest } from "../../SignRequestContext"
import { RiskAnalysisError } from "./RiskAnalysisErrorMessage"
import { RiskAnalysisRecommendation } from "./RiskAnalysisRecommendation"
import { RiskAnalysisStateChanges } from "./RiskAnalysisStateChanges"
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
      <div className="scrollable scrollable-700  flex-grow overflow-y-auto pr-4 text-xs  leading-[2rem]">
        <div className="text-body-secondary leading-paragraph flex w-full flex-col gap-12">
          <div className="text-body text-md text-center font-bold">{t("Risk Assessment")}</div>
          <RiskAnalysisRecommendation scan={scan} />
          <RiskAnalysisError scan={scan} />
          <RiskAnalysisStateChanges scan={scan} />
          {/* <RiskAnalysisWarnings warnings={scan.result.warnings} /> */}
        </div>
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
