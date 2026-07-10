import type { BtcFeeEstimates } from "@talismn/bitcoin"
import { Drawer } from "@ui/components/Drawer"
import { PillButton } from "@ui/components/PillButton"
import { useOpenClose } from "@ui/hooks/useOpenClose"
import imgFeePriorityHigh from "@ui/theme/images/fee-priority-high.png"
import imgFeePriorityLow from "@ui/theme/images/fee-priority-low.png"
import imgFeePriorityMedium from "@ui/theme/images/fee-priority-medium.png"
import { cn } from "@ui/util/cn"
import { type FC, useCallback } from "react"
import { useTranslation } from "react-i18next"

import { type BtcFeePriority, PRIORITY_TO_ESTIMATE } from "./useSendFundsTransactionBtc"

const BTC_PRIORITIES: BtcFeePriority[] = ["economy", "medium", "fast"]

const PRIORITY_ICONS: Record<BtcFeePriority, string> = {
  economy: imgFeePriorityLow,
  medium: imgFeePriorityMedium,
  fast: imgFeePriorityHigh,
}

const usePriorityLabels = (): Record<BtcFeePriority, string> => {
  const { t } = useTranslation()
  return { economy: t("Economy"), medium: t("Medium"), fast: t("Fast") }
}

type BtcFeeSelectProps = {
  priority: BtcFeePriority
  onChange: (priority: BtcFeePriority) => void
  feeEstimates?: BtcFeeEstimates | null
  disabled?: boolean
  drawerContainerId?: string
  className?: string
}

export const BtcFeeSelect: FC<BtcFeeSelectProps> = ({
  priority,
  onChange,
  feeEstimates,
  disabled,
  drawerContainerId,
  className,
}) => {
  const { t } = useTranslation()
  const labels = usePriorityLabels()
  const { isOpen, open, close } = useOpenClose()

  const handleSelect = useCallback(
    (p: BtcFeePriority) => {
      onChange(p)
      close()
    },
    [onChange, close]
  )

  return (
    <>
      <PillButton
        disabled={disabled}
        type="button"
        onClick={open}
        className={cn("h-12 pl-4", className)}
      >
        <img src={PRIORITY_ICONS[priority]} alt="" className="inline-block w-10" />{" "}
        <span className="align-middle">{labels[priority]}</span>
      </PillButton>
      <Drawer
        containerId={drawerContainerId}
        isOpen={isOpen && !disabled}
        anchor="bottom"
        onDismiss={close}
      >
        <div className="flex flex-col gap-12 rounded-t-xl bg-black-tertiary p-12 text-body-secondary text-sm">
          <h3 className="mb-0 text-center font-bold text-base text-body">{t("Fee Options")}</h3>
          <div>
            {t(
              "Bitcoin charges a network fee based on how busy the mempool is. A higher priority confirms faster but costs more."
            )}
          </div>
          <div className="w-full">
            <div className="flex w-full justify-between">
              <div>{t("Priority")}</div>
              <div>{t("Fee Rate")}</div>
            </div>
            {BTC_PRIORITIES.map((p) => {
              const rate = feeEstimates?.[PRIORITY_TO_ESTIMATE[p]]
              const selected = p === priority
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleSelect(p)}
                  className={cn(
                    "mt-4 flex h-28 w-full cursor-pointer items-center gap-6 rounded-sm border-none px-6 text-left font-semibold outline-hidden hover:bg-grey-700 hover:text-white",
                    selected ? "bg-grey-700 text-white" : "bg-grey-750 text-body-secondary"
                  )}
                >
                  <div>
                    <img src={PRIORITY_ICONS[p]} alt="" className="w-16" />
                  </div>
                  <div className="grow">{labels[p]}</div>
                  <div className="text-body">
                    {rate !== undefined ? `${rate} sat/vB` : t("N/A")}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </Drawer>
    </>
  )
}
