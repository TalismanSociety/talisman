import { classNames } from "@talismn/util"
import { CSSProperties, FC, useEffect, useMemo, useRef, useState } from "react"
import { NavLink, useLocation } from "react-router-dom"

import { useSelectedAccount } from "./useSelectedAccount"

export const PortfolioTabs: FC<{ className?: string }> = ({ className }) => {
  const { account, accounts } = useSelectedAccount()

  const tabs = useMemo(() => {
    const withNfts = account
      ? account.type === "ethereum"
      : accounts.some((account) => account.type === "ethereum")

    return [
      { label: "Tokens", path: "/portfolio/tokens" },
      { label: "NFTs", path: "/portfolio/nfts", disabled: !withNfts },
    ]
  }, [account, accounts])

  const refTabs = useRef<HTMLDivElement>(null)
  const location = useLocation()

  const [indicatorStyle, setIndicatorStyle] = useState<CSSProperties>()

  useEffect(() => {
    const container = refTabs.current
    if (!container) return

    const updateIndicator = () => {
      if (!container) return

      const containerRect = container.getBoundingClientRect()
      const activeTab = container.querySelector(".active")
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

    // TODO call this on container resize ?
    // TODO call this on child dom change instead of location change ?
    updateIndicator()
  }, [location])

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
        <NavLink
          key={tab.path}
          to={tab.path}
          className={classNames(
            "text-body-secondary text-md -mb-0.5 flex h-14 select-none flex-col justify-between font-bold",
            "[&.active]:text-primary",
            tab.disabled && "text-body-disabled pointer-events-none cursor-default"
          )}
        >
          {tab.label}
        </NavLink>
      ))}
      <div className="bg-primary-500 absolute bottom-0 left-0 h-0.5" style={indicatorStyle}></div>
    </div>
  )
}
