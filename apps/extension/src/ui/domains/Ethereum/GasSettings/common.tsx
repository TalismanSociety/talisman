import type { EthPriorityOptionName } from "@core/domains/signing/types"
import imgFeePriorityCustom from "@talisman/theme/images/fee-priority-custom.png"
import imgFeePriorityHigh from "@talisman/theme/images/fee-priority-high.png"
import imgFeePriorityLow from "@talisman/theme/images/fee-priority-low.png"
import imgFeePriorityMedium from "@talisman/theme/images/fee-priority-medium.png"
import imgFeePriorityRecommended from "@talisman/theme/images/fee-priority-recommended.png"
import { AlertTriangleIcon, InfoIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { type FC, type PropsWithChildren, useMemo } from "react"
import { useTranslation } from "react-i18next"

export const useFeePriorityOptionsUI = () => {
  const { t } = useTranslation()

  return useMemo<Record<EthPriorityOptionName, { icon: string; label: string }>>(
    () => ({
      low: { icon: imgFeePriorityLow, label: t("Low") },
      medium: { icon: imgFeePriorityMedium, label: t("Normal") },
      high: { icon: imgFeePriorityHigh, label: t("Urgent") },
      custom: { icon: imgFeePriorityCustom, label: t("Custom") },
      recommended: { icon: imgFeePriorityRecommended, label: t("Recommended") },
    }),
    [t]
  )
}

type IndicatorProps = PropsWithChildren & {
  className?: string
  label?: string
}

export const Indicator: FC<IndicatorProps> = ({ children, label, className }) => {
  return (
    <div
      className={classNames(
        "relative flex h-[41px] flex-col justify-center rounded-sm border border-grey-700 px-6 text-body-secondary text-xs",
        className
      )}
    >
      {label && (
        <div className="absolute top-[-0.8rem] left-5 bg-grey-800 px-2 text-[1rem]">{label}</div>
      )}
      <div className="w-full text-left align-top leading-[1.7rem]">{children}</div>
    </div>
  )
}

type MessageRowProps = { type: "error" | "warning"; message: string }

export const MessageRow: FC<MessageRowProps> = ({ type, message }) => {
  return (
    <div
      className={classNames(
        "mt-4 mb-6 h-8 w-full text-left text-xs",
        type === "warning" && "text-alert-warn",
        type === "error" && "text-alert-error",
        message ? "visible" : "invisible"
      )}
    >
      {message && (
        <>
          {type === "warning" && <InfoIcon className="inline align-top" />}
          {type === "error" && <AlertTriangleIcon className="inline align-top" />} {message}
        </>
      )}
    </div>
  )
}
