import {
  ShieldNotOkIcon,
  ShieldOkIcon,
  ShieldUnavailableIcon,
  ShieldUnknownIcon,
  ShieldZapIcon,
} from "@talismn/icons"
import { EvmMessageScan } from "@ui/domains/Ethereum/useScanEvmMessage"
import { EvmTransactionScan } from "@ui/domains/Ethereum/useScanEvmTransaction"
import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { PillButton, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { useEthSignMessageRequest, useEthSignTransactionRequest } from "../../SignRequestContext"
import { RisksReview } from "./useRisksReview"

export const RisksAnalysisTxButton = () => {
  const { scan, risksReview } = useEthSignTransactionRequest()
  return <RiskAnalysisPillButton scan={scan} risksReview={risksReview} />
}

export const RisksAnalysisMsgButton = () => {
  const { scan, risksReview } = useEthSignMessageRequest()
  return <RiskAnalysisPillButton scan={scan} risksReview={risksReview} />
}

const RiskAnalysisPillButton: FC<{
  scan: EvmTransactionScan | EvmMessageScan
  risksReview: RisksReview
}> = ({ scan, risksReview }) => {
  const { t } = useTranslation()

  const { icon, label, className, disabled } = useMemo(() => {
    if (scan?.result?.action === "NONE")
      return {
        label: t("Low Risk"),
        icon: ShieldOkIcon,
        className: "text-alert-success",
        disabled: false,
      }
    if (scan?.result?.action === "WARN")
      return {
        label: t("Medium Risk"),
        icon: ShieldZapIcon,
        className: "text-alert-warn",
        disabled: false,
      }
    if (scan?.result?.action === "BLOCK")
      return {
        label: t("Critical Risk"),
        icon: ShieldNotOkIcon,
        className: "text-brand-orange",
        disabled: false,
      }
    if (scan.isAvailable)
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
  }, [t, scan])

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <PillButton
          disabled={disabled}
          size="sm"
          icon={icon}
          onClick={risksReview.drawer.open}
          className={className}
        >
          {label}
        </PillButton>
      </TooltipTrigger>
      {disabled && (
        <TooltipContent>{t("Risk analysis is not available on this network")}</TooltipContent>
      )}
    </Tooltip>
  )
}
