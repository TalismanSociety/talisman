import { Transition, TransitionChild } from "@headlessui/react"
import { ArrowRightIcon, ShieldNotOkIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { Button } from "@ui/components/Button"
import { Drawer } from "@ui/components/Drawer"
import { useOpenClose } from "@ui/hooks/useOpenClose"
import { useSetting } from "@ui/state/settings"
import { type FC, useCallback, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { RiskAnalysisExposures } from "./RiskAnalysisExposures"
import { RiskAnalysisRecommendation } from "./RiskAnalysisRecommendation"
import { RiskAnalysisStateChanges } from "./RiskAnalysisStateChanges"
import { RisksAnalysisAcknowledgement } from "./RisksAnalysisAcknowledgement"
import type { RiskAnalysis } from "./types"

const RiskAnalysisDrawerContent: FC<{ riskAnalysis: RiskAnalysis }> = ({ riskAnalysis }) => {
  const { t } = useTranslation()

  return (
    <div className="flex max-h-[37.5rem] w-full flex-col gap-12 rounded-t-xl bg-grey-850 p-12">
      <div className="scrollable scrollable-700 flex-grow overflow-y-auto pr-4 text-xs leading-[1.25rem]">
        <div className="flex w-full flex-col gap-12 text-body-secondary leading-paragraph">
          <div className="text-center font-bold text-body text-md">{t("Risk Assessment")}</div>
          <RiskAnalysisRecommendation riskAnalysis={riskAnalysis} />
          <RiskAnalysisStateChanges riskAnalysis={riskAnalysis} />
          <RiskAnalysisExposures riskAnalysis={riskAnalysis} />
        </div>
      </div>
      <RisksAnalysisAcknowledgement riskAnalysis={riskAnalysis} />
      <div>
        <Button onClick={riskAnalysis.review.drawer.close} className="w-full">
          {t("Close")}
        </Button>
      </div>
    </div>
  )
}

const RiskAnalysisPromptAutoRiskScan: FC = () => {
  const [, setAutoRiskScan] = useSetting("autoRiskScan")
  const { t } = useTranslation()

  const handleClick = useCallback(
    (enable: boolean) => () => {
      setAutoRiskScan(enable)
    },
    [setAutoRiskScan]
  )

  return (
    <div className="flex w-full animate-fade-in flex-col gap-12 rounded-t-xl bg-grey-850 p-12">
      <div className="scrollable scrollable-700 flex-grow overflow-y-auto pr-4 text-xs leading-[1.25rem]">
        <div className="flex w-full flex-col gap-8 text-body-secondary leading-paragraph">
          <div className="text-center font-bold text-body text-md">
            {t("Automatic risk assessments")}
          </div>
          <div className="text-center text-body-secondary text-sm">
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
  riskAnalysis: RiskAnalysis | undefined
  onReject?: () => void
}> = ({ riskAnalysis, onReject = () => window.close() }) => {
  const { t } = useTranslation()

  const { isOpen, open, close } = useOpenClose()

  useEffect(() => {
    if (riskAnalysis?.validationResult === "Malicious") open()
  }, [open, riskAnalysis?.validationResult])

  if (riskAnalysis?.disableCriticalPane) return null

  return (
    <Transition show={isOpen}>
      <TransitionChild
        as="div"
        className={classNames(
          "fixed top-0 left-0 z-10 h-[37.5rem] w-[25rem]",
          "flex flex-col items-center gap-8 p-12",
          "bg-gradient-to-b from-[#411D1D] to-black-primary"
        )}
        enter="opacity-100" // no fade in (other drawer is opening to under it)
        leave="transition-opacity ease-linear duration-200"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div className="flex grow flex-col items-center justify-center gap-8 text-center">
          <div className="rounded-full bg-[#411D1D] p-6 text-brand-orange shadow-black/30 shadow-md">
            <ShieldNotOkIcon className="size-36" />
          </div>
          <div className="font-bold text-brand-orange text-lg">{t("Critical Risk")}</div>
          <p className="text-body text-md">
            {t("We suspect this request is harmful.")}
            <br />
            {t("Signing it could lead to funds loss.")}
          </p>
        </div>
        <button
          type="button"
          onClick={close}
          className="flex items-center text-base text-brand-orange/80 hover:text-brand-orange"
        >
          <span>{t("Proceed anyway")}</span>
          <ArrowRightIcon className="inline-block text-md" />
        </button>
        <Button fullWidth onClick={onReject}>
          {t("Cancel")}
        </Button>
      </TransitionChild>
    </Transition>
  )
}

export const RiskAnalysisDrawers: FC<{
  riskAnalysis?: RiskAnalysis
  containerId?: string
  onReject?: () => void
}> = ({ riskAnalysis, containerId = "main", onReject }) => {
  if (!riskAnalysis) return null

  return (
    <>
      <Drawer
        anchor="bottom"
        containerId={containerId}
        isOpen={riskAnalysis.review.drawer.isOpen}
        onDismiss={riskAnalysis.review.drawer.close}
      >
        <RiskAnalysisDrawerContent riskAnalysis={riskAnalysis} />
      </Drawer>
      <RiskAnalysisCriticalPane riskAnalysis={riskAnalysis} onReject={onReject} />
      <Drawer
        anchor="bottom"
        containerId={containerId}
        isOpen={riskAnalysis.shouldPromptAutoRiskScan}
      >
        <RiskAnalysisPromptAutoRiskScan />
      </Drawer>
    </>
  )
}
