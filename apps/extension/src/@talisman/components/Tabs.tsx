import { classNames } from "@talismn/util"
import { CSSProperties, FC, useEffect, useRef, useState } from "react"

export type TabDef = {
  value: string
  label: string
  disabled?: boolean
}

export const Tabs: FC<{
  tabs: TabDef[]
  selected?: string
  className?: string
  onChange: (value: string) => void
}> = ({ tabs, selected, className, onChange }) => {
  const refTabs = useRef<HTMLDivElement>(null)

  const [indicatorStyle, setIndicatorStyle] = useState<CSSProperties>()

  useEffect(() => {
    const container = refTabs.current
    if (!container) return

    const updateIndicator = () => {
      if (!container) return

      const containerRect = container.getBoundingClientRect()
      const activeTab = container.querySelector(".selected")
      if (!activeTab) return setIndicatorStyle({})

      const activeTabRect = activeTab.getBoundingClientRect()
      setIndicatorStyle((prev) => {
        const width = activeTabRect.width
        const transform = `translateX(${activeTabRect.left - containerRect.left}px)`
        const transition =
          prev?.width !== activeTabRect.width
            ? "transform 100ms ease-in-out, width 100ms ease-in-out"
            : undefined
        return { transition, width, transform }
      })
    }

    updateIndicator()
  }, [selected, setIndicatorStyle])

  return (
    <div
      ref={refTabs}
      className={classNames(
        "border-grey-700 relative flex h-12 w-full gap-12 border-b text-sm font-light",
        indicatorStyle ? "visible" : "invisible", // wait for indicator's style to be ready, prevents flickering
        className
      )}
    >
      {tabs.map((tab) => (
        <button
          type="button"
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={classNames(
            "text-body-secondary -mb-0.5 flex h-full select-none flex-col justify-between",
            tab.value === selected && "text-primary selected",
            tab.disabled && "text-body-disabled pointer-events-none cursor-default"
          )}
        >
          {tab.label}
        </button>
      ))}
      <div
        className="bg-primary-500 absolute bottom-0 left-0 -mb-0.5 h-0.5"
        style={indicatorStyle}
      ></div>
    </div>
  )
}
