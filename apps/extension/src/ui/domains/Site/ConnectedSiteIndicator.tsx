import { classNames } from "@talismn/util"
import { FC } from "react"

import { SiteConnectionStatus } from "./types"

export const ConnectedSiteIndicator: FC<{
  status: SiteConnectionStatus
  className?: string
}> = ({ status, className }) => {
  return (
    <div
      className={classNames(
        "flex h-8 w-8 items-center justify-center rounded-full border-2",
        status === "connected" && "border-green-500/20",
        status === "disconnected" && "border-brand-orange/20",
        status === "disabled" && "border-grey-500/20",
        className
      )}
    >
      <div
        className={classNames(
          "h-4 w-4 rounded-full",
          status === "connected" && "bg-green-500",
          status === "disconnected" && "bg-brand-orange",
          status === "disabled" && "bg-grey-500"
        )}
      ></div>
    </div>
  )
}
