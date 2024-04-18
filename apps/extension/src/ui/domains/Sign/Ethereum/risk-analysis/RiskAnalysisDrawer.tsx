import { FC } from "react"
import { useTranslation } from "react-i18next"
import { Button, Drawer } from "talisman-ui"

import { useRiskAnalysis } from "./context"
import { RiskAnalysisError } from "./RiskAnalysisErrorMessage"
import { RiskAnalysisRecommendation } from "./RiskAnalysisRecommendation"
import { RiskAnalysisStateChanges } from "./RiskAnalysisStateChanges"
import { RisksAnalysisAknowledgement } from "./RisksAnalysisAknowledgement"

const RiskAnalysisDrawerContent: FC = () => {
  const { riskAnalysis, drawer } = useRiskAnalysis()
  const { t } = useTranslation()

  if (!riskAnalysis?.isAvailable) return null

  // TODO
  if (riskAnalysis.isValidating) return <div>Validating...</div>

  if (!riskAnalysis.result) return <div>Result not available</div>
  if (!riskAnalysis.chainInfo) return <div>Chain information not available</div>

  return (
    <div className="bg-grey-850 flex h-[60rem] w-full flex-col gap-12 p-12">
      <div className="scrollable scrollable-700  flex-grow overflow-y-auto pr-4 text-xs  leading-[2rem]">
        <div className="text-body-secondary leading-paragraph flex w-full flex-col gap-12">
          <div className="text-body text-md text-center font-bold">{t("Risk Assessment")}</div>
          <RiskAnalysisRecommendation riskAnalysis={riskAnalysis} />
          <RiskAnalysisError riskAnalysis={riskAnalysis} />
          <RiskAnalysisStateChanges riskAnalysis={riskAnalysis} />
        </div>
      </div>
      <RisksAnalysisAknowledgement />
      <div>
        <Button onClick={drawer.close} className="w-full">
          {t("Close")}
        </Button>
      </div>
    </div>
  )
}

export const RiskAnalysisDrawer: FC = () => {
  const { drawer } = useRiskAnalysis()

  return (
    <Drawer anchor="bottom" containerId="main" isOpen={drawer.isOpen} onDismiss={drawer.close}>
      <RiskAnalysisDrawerContent />
    </Drawer>
  )
}
