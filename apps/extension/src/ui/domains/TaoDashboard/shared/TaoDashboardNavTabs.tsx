import { cn } from "@talismn/util"
import type { FC, PropsWithChildren, ReactNode } from "react"

export interface NavTabConfig<T extends string> {
  value: T
  label: ReactNode
}

interface TaoDashboardNavTabsProps<T extends string> {
  tabs: NavTabConfig<T>[]
  selected: T
  onSelect: (tab: T) => void
  className?: string
}

export const TaoDashboardNavTabs = <T extends string>({
  tabs,
  selected,
  onSelect,
  className,
}: TaoDashboardNavTabsProps<T>) => {
  return (
    <div
      className={cn(
        "inline-flex h-28 max-w-full shrink-0 items-center gap-4 overflow-hidden rounded-lg border border-grey-700 p-4 text-sm",
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
        "relative h-full rounded-sm px-10 text-body-secondary",
        isSelected ? "bg-grey-800 font-bold text-body" : "hover:bg-grey-800"
      )}
      onClick={onClick}
    >
      {/* invisible bold text to keep button width consistent */}
      <div className="invisible font-bold">{children}</div>
      {/* rendered button text */}
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </button>
  )
}
