import { NavItem, NavItemProps } from "@talisman/components/Nav"
import { ExternalLinkIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { ReactNode } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

type Props = Omit<NavItemProps, "children"> & {
  title: ReactNode
  isExternalLink?: boolean
  children?: ReactNode
  navItemClassName?: string
}

export const SidebarNavItem = ({
  title,
  isExternalLink,
  className,
  navItemClassName,
  contentClassName,
  children,
  ...props
}: Props) => {
  return (
    <ResponsiveTooltip tooltip={title} className={className}>
      <NavItem
        {...props}
        className={classNames("flex-col md:text-center lg:flex-row lg:text-left", navItemClassName)}
        contentClassName={classNames("hidden md:block", contentClassName)}
      >
        {isExternalLink ? (
          <span className="inline-flex items-center">
            <span>{children ?? title}</span>
            <ExternalLinkIcon className="ml-2 hidden lg:inline" />
          </span>
        ) : (
          <>{children ?? title}</>
        )}
      </NavItem>
    </ResponsiveTooltip>
  )
}

// show tooltip only on small screens
const ResponsiveTooltip = ({
  tooltip,
  className,
  children,
}: {
  className?: string
  tooltip?: ReactNode
  children?: ReactNode
}) => (
  <Tooltip placement="right">
    <TooltipTrigger asChild>
      <div className={classNames("w-full", className)}>{children}</div>
    </TooltipTrigger>
    <TooltipContent className="rounded-xs text-body-secondary border-grey-700 z-20 border-[0.5px] bg-black p-3 text-xs shadow md:hidden">
      {tooltip}
    </TooltipContent>
  </Tooltip>
)
