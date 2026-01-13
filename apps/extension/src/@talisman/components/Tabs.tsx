import { classNames } from "@talismn/util"
import { type CSSProperties, type FC, useEffect, useRef, useState } from "react"

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
        "relative flex h-12 w-full shrink-0 gap-12 border-grey-700 border-b font-light text-sm",
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
            "-mb-0.5 flex h-full select-none flex-col justify-between text-body-secondary",
            tab.value === selected && "selected text-primary",
            tab.disabled && "pointer-events-none cursor-default text-body-disabled"
          )}
        >
          {tab.label}
        </button>
      ))}
      <div
        className="absolute bottom-0 left-0 -mb-0.5 h-0.5 bg-primary-500"
        style={indicatorStyle}
      ></div>
    </div>
  )
}
