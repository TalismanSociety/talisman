import { cn } from "@talismn/util"
import { type FC, type PropsWithChildren, type ReactNode, useMemo } from "react"
import { useTranslation } from "react-i18next"

export type TimePeriod = "1D" | "1W" | "1M"

export const getDaysPerPeriod = (period: TimePeriod): number => {
  switch (period) {
    case "1D":
      return 1
    case "1W":
      return 7
    case "1M":
      return 30
  }
}

interface PeriodTabConfig {
  value: TimePeriod
  label: ReactNode
}

interface TaoDashboardPeriodTabsProps {
  selected: TimePeriod
  onSelect: (tab: TimePeriod) => void
  className?: string
}

export const TaoDashboardPeriodTabs = ({
  selected,
  onSelect,
  className,
}: TaoDashboardPeriodTabsProps) => {
  const { t } = useTranslation()

  const tabs = useMemo<PeriodTabConfig[]>(
    () => [
      { value: "1D", label: t("1D") },
      { value: "1W", label: t("1W") },
      { value: "1M", label: t("1M") },
    ],
    [t]
  )

  return (
    <div
      className={cn(
        "inline-flex h-[2.6rem] max-w-full items-center gap-1 overflow-hidden rounded-xs bg-grey-850 p-1 font-bold text-sm",
        className
      )}
    >
      {tabs.map((tab) => (
        <Tab
          key={tab.value}
          isSelected={selected === tab.value}
          onClick={() => onSelect(tab.value)}
        >
          {tab.label}
        </Tab>
      ))}
    </div>
  )
}

const Tab: FC<
  PropsWithChildren<{
    isSelected: boolean
    onClick: () => void
  }>
> = ({ isSelected, onClick, children }) => {
  return (
    <button
      type="button"
      className={cn(
        "relative h-full rounded-sm px-3 font-bold text-body",
        isSelected ? "bg-grey-700" : "hover:bg-grey-750"
      )}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
