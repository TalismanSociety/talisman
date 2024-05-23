import { classNames } from "@talismn/util"
import { CSSProperties, FC, useEffect, useRef, useState } from "react"
import { useLocation } from "react-router-dom"

export type TabDef = {
  value: string
  label: string
  disabled?: boolean
}

export const Tabs: FC<{
  tabs: TabDef[]
  selected: string
  onChange: (value: string) => void
  className?: string
}> = ({ tabs, selected, className, onChange }) => {
  const refTabs = useRef<HTMLDivElement>(null)
  const location = useLocation()

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
  }, [location, setIndicatorStyle])

  return (
    <div
      ref={refTabs}
      className={classNames(
        "border-grey-700 relative mb-6 flex w-full gap-12 border-b",
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
            "text-body-secondary text-md -mb-0.5 flex h-14 select-none flex-col justify-between font-bold",
            tab.value === selected && "text-primary selected",
            tab.disabled && "text-body-disabled pointer-events-none cursor-default"
          )}
        >
          {tab.label}
        </button>
      ))}
      <div className="bg-primary-500 absolute bottom-0 left-0 h-0.5" style={indicatorStyle}></div>
    </div>
  )
}
