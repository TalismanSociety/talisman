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
        <BlowfishUIProvider
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
          <div>
            <StateChangePreviewEvm
              sectionLabel={"Expected state changes"}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
