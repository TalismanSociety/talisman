import { ActionEnum } from "@blowfishxyz/api-client/v20230605"
import { Transition } from "@headlessui/react"
import { ArrowRightIcon, ShieldNotOkIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useSetting } from "@ui/hooks/useSettings"
import { FC, useCallback, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Button, Drawer, useOpenClose } from "talisman-ui"

import { RiskAnalysisRecommendation } from "./RiskAnalysisRecommendation"
import { RiskAnalysisStateChanges } from "./RiskAnalysisStateChanges"
import { RisksAnalysisAknowledgement } from "./RisksAnalysisAknowledgement"
import { EvmRiskAnalysis } from "./types"

const RiskAnalysisDrawerContent: FC<{ riskAnalysis: EvmRiskAnalysis }> = ({ riskAnalysis }) => {
  const { t } = useTranslation()

  return (
    <div className="bg-grey-850 flex max-h-[60rem] w-full flex-col gap-12 rounded-t-xl p-12">
      <div className="scrollable scrollable-700  flex-grow overflow-y-auto pr-4 text-xs  leading-[2rem]">
        <div className="text-body-secondary leading-paragraph flex w-full flex-col gap-12">
          <div className="text-body text-md text-center font-bold">{t("Risk Assessment")}</div>
          <RiskAnalysisRecommendation riskAnalysis={riskAnalysis} />
          <RiskAnalysisStateChanges riskAnalysis={riskAnalysis} />
        </div>
      </div>
      <RisksAnalysisAknowledgement riskAnalysis={riskAnalysis} />
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
    <div className="animate-fade-in bg-grey-850 flex w-full flex-col gap-12 rounded-t-xl p-12">
      <div className="scrollable scrollable-700  flex-grow overflow-y-auto pr-4 text-xs  leading-[2rem]">
        <div className="text-body-secondary leading-paragraph flex w-full flex-col gap-8">
          <div className="text-body text-md text-center font-bold">
            {t("Automatic risk assessments")}
          </div>
          <div className="text-body-secondary text-center text-sm">
            <p>
              {t(
                "Ethereum transactions and messages can be simulated on a secure server to assess their risk. Would you like to enable this feature?"
              )}
            </p>
            <p className="mt-4 text-center">
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

const RiskAnalysisCriticalPane: FC<{
  riskAnalysis: EvmRiskAnalysis | undefined
  onReject?: () => void
}> = ({ riskAnalysis, onReject = () => window.close() }) => {
  const { t } = useTranslation()

  const { isOpen, open, close } = useOpenClose()

  useEffect(() => {
    if (riskAnalysis?.result?.action === ActionEnum.Block) open()
  }, [open, riskAnalysis?.result?.action])

  return (
    <Transition show={isOpen}>
      <Transition.Child
        className={classNames(
          "fixed left-0 top-0 z-10 h-[60rem] w-[40rem]",
          "flex flex-col items-center gap-8 p-12",
          "to-black-primary bg-gradient-to-b from-[#411D1D]"
        )}
        enter="opacity-100" // no fade in (other drawer is opening to under it)
        leave="transition-opacity ease-linear duration-200"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div className="flex grow flex-col items-center justify-center gap-8 text-center">
          <div className=" text-brand-orange rounded-full bg-[#411D1D] p-6 shadow-md shadow-black/30">
            <ShieldNotOkIcon className="size-36" />
          </div>
          <div className="text-brand-orange text-lg font-bold">{t("Critical Risk")}</div>
          <p className="text-body text-md">
            {riskAnalysis?.type === "transaction" && t("We suspect this transaction is harmful.")}
            {riskAnalysis?.type === "message" && t("We suspect this message is harmful.")}
            <br />
            {t("Signing it could lead to funds loss.")}
          </p>
        </div>
        <button
          type="button"
          onClick={close}
          className="text-brand-orange/80 hover:text-brand-orange flex items-center text-base"
        >
          <span>{t("Proceed anyway")}</span>
          <ArrowRightIcon className="text-md inline-block" />
        </button>
        <Button fullWidth onClick={onReject}>
          {t("Cancel")}
        </Button>
      </Transition.Child>
    </Transition>
  )
}

export const RiskAnalysisDrawers: FC<{ riskAnalysis?: EvmRiskAnalysis; onReject?: () => void }> = ({
  riskAnalysis,
  onReject,
}) => {
  if (!riskAnalysis) return null

  return (
    <>
      <Drawer
        anchor="bottom"
        containerId="main"
        isOpen={riskAnalysis.review.drawer.isOpen}
        onDismiss={riskAnalysis.review.drawer.close}
      >
        <RiskAnalysisDrawerContent riskAnalysis={riskAnalysis} />
      </Drawer>
      <RiskAnalysisCriticalPane riskAnalysis={riskAnalysis} onReject={onReject} />
      <Drawer anchor="bottom" containerId="main" isOpen={riskAnalysis.shouldPromptAutoRiskScan}>
        <RiskAnalysisPromptAutoRiskScan />
      </Drawer>
    </>
  )
}
