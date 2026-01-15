import { cn } from "@talismn/util"
import type { FC, PropsWithChildren } from "react"
import { useTranslation } from "react-i18next"

const TAO_DASHBOARD_SWAP_TABS = ["buy", "sell"] as const

export type TaoDashboardSwapTabs = (typeof TAO_DASHBOARD_SWAP_TABS)[number]

export const SwapTabs: FC<{
  selected: TaoDashboardSwapTabs
  onSelect: (tab: TaoDashboardSwapTabs) => void
}> = ({ selected, onSelect: onChanged }) => {
  const { t } = useTranslation()

  return (
    <div className="flex h-20 w-full shrink-0 overflow-hidden bg-grey-850">
      <SwapTab
        isSelected={selected === "buy"}
        selectedClassName={cn("border-buy text-buy")}
        onClick={() => onChanged("buy")}
      >
        {t("Buy")}
      </SwapTab>
      <SwapTab
        isSelected={selected === "sell"}
        selectedClassName={cn("border-sell text-sell")}
        onClick={() => onChanged("sell")}
      >
        {t("Sell")}
      </SwapTab>
    </div>
  )
}

const SwapTab: FC<
  PropsWithChildren<{
    isSelected: boolean
    selectedClassName: string
    onClick: () => void
  }>
> = ({ isSelected, selectedClassName, onClick, children }) => {
  return (
    <button
      type="button"
      className={cn(
        "relative h-full flex-1 border-grey-700 border-b-2 font-semibold text-body-inactive text-sm transition-colors",
        isSelected ? selectedClassName : "hover:bg-grey-800"
      )}
      onClick={onClick}
    >
      <span className="absolute inset-0 grid place-items-center">{children}</span>
    </button>
  )
}
