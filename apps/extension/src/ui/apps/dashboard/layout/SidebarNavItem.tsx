import { classNames } from "@talismn/util"
import { FC, ReactNode } from "react"
import { NavLink, To, useMatch } from "react-router-dom"

export const SidebarNavItem: FC<{
  to: To
  icon: ReactNode
  label: ReactNode
  matchPath?: string
  className?: string
}> = ({ to, icon, label, matchPath, className }) => {
  const forceActive = useMatch(matchPath ?? "UNEXISTANT_PATH")

  return (
    <NavLink
      to={to}
      className={classNames(
        "flex w-full items-center gap-6 overflow-hidden rounded",
        "text-body-inactive [&.active]:text-body",
        "hover:bg-grey-750 [&.active]:bg-grey-800",
        "h-28 px-6",
        forceActive && "active",
        className,
      )}
    >
      <span className="size-12 shrink-0 text-lg">{icon}</span>
      <span className="truncate">{label}</span>
    </NavLink>
  )
}
