import { useSetting } from "@ui/hooks/useSettings"
import { FC, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { Button, Drawer } from "talisman-ui"

import { useRiskAnalysis } from "./context"
import { RiskAnalysisError } from "./RiskAnalysisErrorMessage"
import { RiskAnalysisRecommendation } from "./RiskAnalysisRecommendation"
import { RiskAnalysisStateChanges } from "./RiskAnalysisStateChanges"
import { RisksAnalysisAknowledgement } from "./RisksAnalysisAknowledgement"

const RiskAnalysisDrawerContent: FC = () => {
  const riskAnalysis = useRiskAnalysis()
  const { t } = useTranslation()

  if (!riskAnalysis) return null

  return (
    <div className="bg-grey-850 flex max-h-[60rem] w-full flex-col gap-12 rounded-t-xl p-12">
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
        <Button onClick={riskAnalysis.review.drawer.close} className="w-full">
          {t("Close")}
        </Button>
      </div>
    </div>
  )
}

export const RiskAnalysisPromptAutoRiskScan: FC = () => {
  const [, setAutoRiskScan] = useSetting("autoRiskScan")
  const { t } = useTranslation()

  const handleClick = useCallback(
    (enable: boolean) => () => {
      setAutoRiskScan(enable)
    },
    [setAutoRiskScan]
  )

  return (
    <div className="bg-grey-850 flex w-full flex-col gap-12 rounded-t-xl p-12">
      <div className="scrollable scrollable-700  flex-grow overflow-y-auto pr-4 text-xs  leading-[2rem]">
        <div className="text-body-secondary leading-paragraph flex w-full flex-col gap-8">
          <div className="text-body text-md text-center font-bold">
            {t("Automatic risk assessments")}
          </div>
          <div className="text-body-secondary text-justify text-sm">
            <p>
              {t(
                "Ethereum transactions and messages can be simulated on a secure server to assess their risk. Would you like to enable this feature?"
              )}
            </p>
            <p className="mt-4 text-justify">
              {t("You may change this later from Talisman settings.")}
            </p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-8">
        <Button onClick={handleClick(false)}>{t("No")}</Button>
        <Button onClick={handleClick(true)} primary>
          {t("Yes")}
        </Button>
      </div>
    </div>
  )
}

export const RiskAnalysisDrawer: FC = () => {
  const riskAnalysis = useRiskAnalysis()

  if (!riskAnalysis) return null

  return (
    <>
      <Drawer
        anchor="bottom"
        containerId="main"
        isOpen={riskAnalysis.review.drawer.isOpen}
        onDismiss={riskAnalysis.review.drawer.close}
      >
        <RiskAnalysisDrawerContent />
      </Drawer>
      <Drawer anchor="bottom" containerId="main" isOpen={riskAnalysis.shouldPromptAutoRiskScan}>
        <RiskAnalysisPromptAutoRiskScan />
      </Drawer>
    </>
  )
}
