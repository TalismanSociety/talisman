import { cn } from "@ui/util/cn"
import { type FC, type PropsWithChildren, type ReactNode, useMemo } from "react"
import { useTranslation } from "react-i18next"
import type { TimePeriod } from "./types"

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
      { value: "1d", label: t("1D") },
      { value: "1w", label: t("1W") },
      { value: "1m", label: t("1M") },
    ],
    [t]
  )

  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex h-6.5 max-w-full items-center gap-1 overflow-hidden rounded-xs bg-grey-850 p-1 font-bold text-sm",
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
      role="tab"
      aria-selected={isSelected}
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
