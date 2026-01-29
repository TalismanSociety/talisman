import { cn } from "@talismn/util"
import type { FC, PropsWithChildren, ReactNode } from "react"

export interface TabConfig<T extends string> {
  value: T
  label: ReactNode
  selectedClassName?: string
}

interface TaoDashboardTabsProps<T extends string> {
  tabs: TabConfig<T>[]
  selected: T
  onSelect: (tab: T) => void
  className?: string
  defaultSelectedClassName?: string
}

export const TaoDashboardTabs = <T extends string>({
  tabs,
  selected,
  onSelect,
  className,
  defaultSelectedClassName = "border-white text-white",
}: TaoDashboardTabsProps<T>) => {
  return (
    <div className={cn("flex h-20 w-full shrink-0 overflow-hidden", className)}>
      {tabs.map((tab) => (
        <TaoDashboardTab
          key={tab.value}
          isSelected={selected === tab.value}
          selectedClassName={tab.selectedClassName ?? defaultSelectedClassName}
          onClick={() => onSelect(tab.value)}
        >
          {tab.label}
        </TaoDashboardTab>
      ))}
    </div>
  )
}

const TaoDashboardTab: FC<
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
