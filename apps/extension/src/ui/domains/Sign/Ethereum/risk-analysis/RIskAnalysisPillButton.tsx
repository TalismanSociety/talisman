import { BlowfishUIProvider, SimulationWarning, StateChangePreviewEvm } from "@blowfishxyz/ui"
import {
  ShieldNotOkIcon,
  ShieldOkIcon,
  ShieldUnavailableIcon,
  ShieldUnknownIcon,
  ShieldZapIcon,
} from "@talismn/icons"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import {
  Drawer,
  PillButton,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  useOpenClose,
} from "talisman-ui"

import { useEthSignTransactionRequest } from "../../SignRequestContext"

const RiskAnalysisDrawerContent = () => {
  const { validation } = useEthSignTransactionRequest()

  if (!validation?.isAvailable) return null

  // TODO
  if (validation.isValidating) return <div>Validating...</div>

  if (!validation.result) return <div>Result not available</div>
  if (!validation.chainInfo) return <div>Chain information not available</div>

  return (
    <div className="bg-grey-850 flex max-h-[60rem] w-full flex-col gap-12 p-12">
      <div className="scrollable scrollable-700 flex-grow overflow-y-auto pr-4 text-sm leading-[2rem]">
        <BlowfishUIProvider mode="dark">
          <div>
            <StateChangePreviewEvm
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              scanResult={validation.result}
              {...validation.chainInfo}
            />
            <div>
              {validation.result.warnings.map((warning) => (
                <SimulationWarning key={warning.message} warning={warning} />
              ))}
            </div>
          </div>
        </BlowfishUIProvider>
      </div>
    </div>
  )
}

export const RiskAnalysisPillButton = () => {
  const { t } = useTranslation()
  const { isOpen, open, close } = useOpenClose()
  const { isLoading, validation } = useEthSignTransactionRequest()

  const { icon, label, className, disabled } = useMemo(() => {
    if (validation?.result?.action === "NONE")
      return {
        label: t("Low Risk"),
        icon: ShieldOkIcon,
        className: "text-alert-success",
        disabled: false,
      }
    if (validation?.result?.action === "WARN")
      return {
        label: t("Medium Risk"),
        icon: ShieldZapIcon,
        className: "text-alert-warn",
        disabled: false,
      }
    if (validation?.result?.action === "BLOCK")
      return {
        label: t("Critical Risk"),
        icon: ShieldNotOkIcon,
        className: "text-brand-orange",
        disabled: false,
      }
    if (validation.isAvailable)
      return {
        icon: ShieldUnknownIcon,
        label: t("Analyse Risks"),
        className: undefined,
        disabled: false,
      }
    return {
      icon: ShieldUnavailableIcon,
      label: t("Risk Analysis"),
      className: undefined,
      disabled: true,
    }
  }, [t, validation])

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <PillButton
            disabled={disabled}
            size="sm"
            icon={icon}
            onClick={open}
            className={className}
          >
            {label}
          </PillButton>
        </TooltipTrigger>
        {disabled && (
          <TooltipContent>{t("Risk analysis is not available on this network")}</TooltipContent>
        )}
      </Tooltip>
      <Drawer anchor="bottom" containerId="main" isOpen={isOpen && !isLoading} onDismiss={close}>
        <RiskAnalysisDrawerContent />
      </Drawer>
    </>
  )
}
