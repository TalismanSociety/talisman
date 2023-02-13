import { EthPriorityOptionName } from "@core/domains/signing/types"
import { AlertTriangleIcon, InfoIcon } from "@talisman/theme/icons"
import imgFeePriorityCustom from "@talisman/theme/images/fee-priority-custom.png"
import imgFeePriorityHigh from "@talisman/theme/images/fee-priority-high.png"
import imgFeePriorityLow from "@talisman/theme/images/fee-priority-low.png"
import imgFeePriorityMedium from "@talisman/theme/images/fee-priority-medium.png"
import imgFeePriorityRecommended from "@talisman/theme/images/fee-priority-recommended.png"
import { classNames } from "@talismn/util"
import { FC, PropsWithChildren } from "react"

export const FEE_PRIORITY_OPTIONS: Record<EthPriorityOptionName, { icon: string; label: string }> =
  {
    low: { icon: imgFeePriorityLow, label: "Low" },
    medium: { icon: imgFeePriorityMedium, label: "Normal" },
    high: { icon: imgFeePriorityHigh, label: "Urgent" },
    custom: { icon: imgFeePriorityCustom, label: "Custom" },
    recommended: { icon: imgFeePriorityRecommended, label: "Recommended" },
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
