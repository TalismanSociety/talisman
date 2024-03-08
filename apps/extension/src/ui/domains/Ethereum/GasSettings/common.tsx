import { EthPriorityOptionName } from "@extension/core"
import imgFeePriorityCustom from "@talisman/theme/images/fee-priority-custom.png"
import imgFeePriorityHigh from "@talisman/theme/images/fee-priority-high.png"
import imgFeePriorityLow from "@talisman/theme/images/fee-priority-low.png"
import imgFeePriorityMedium from "@talisman/theme/images/fee-priority-medium.png"
import imgFeePriorityRecommended from "@talisman/theme/images/fee-priority-recommended.png"
import { AlertTriangleIcon, InfoIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC, PropsWithChildren, useMemo } from "react"
import { useTranslation } from "react-i18next"

export const useFeePriorityOptionsUI = () => {
  const { t } = useTranslation("request")

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
        "border-grey-700 text-body-secondary relative flex h-[41px] flex-col justify-center rounded-sm border px-6 text-xs",
        className
      )}
    >
      {label && (
        <div className="bg-grey-800 absolute left-5 top-[-0.8rem] px-2 text-[1rem]">{label}</div>
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
        "mb-6 mt-4 h-8 w-full text-left text-xs",
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
