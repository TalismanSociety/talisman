import { classNames } from "@ui/util/cn"
import type { DetailedHTMLProps, FC, HTMLAttributes, ReactNode } from "react"
import { NavLink, type To } from "react-router-dom"

export const Nav: FC<DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>> = ({
  className,
  ...props
}) => (
  <nav className={classNames("flex flex-col items-start justify-start", className)} {...props} />
)

export type NavItemProps = {
  className?: string
  children: ReactNode
  icon: ReactNode
  iconContainerClassName?: string
  contentClassName?: string
  to?: To
  onClick?: () => void
}

export const NavItem: FC<NavItemProps> = ({
  className,
  children,
  icon,
  iconContainerClassName,
  contentClassName,
  to,
  ...props
}) => {
  const iconContainer = icon && (
    <div
      className={classNames("flex w-20 shrink-0 justify-center text-lg", iconContainerClassName)}
    >
      {icon}
    </div>
  )
  const content = (
    <>
      {iconContainer}
      <div className={classNames("grow", contentClassName)}>{children}</div>
    </>
  )

  const isNavLink = to !== undefined
  const navClassName = classNames(
    "flex h-28 w-full shrink items-center justify-start gap-4 rounded-sm p-4 text-left text-body-secondary hover:bg-grey-800 hover:text-body",
    isNavLink && "[&.active]:text-body",
    className
  )

  if (isNavLink)
    return (
      <NavLink to={to} className={navClassName} {...props}>
        {content}
      </NavLink>
    )
  return (
    <button type="button" className={navClassName} {...props}>
      {content}
    </button>
  )
}
