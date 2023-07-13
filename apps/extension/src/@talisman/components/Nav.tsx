import { classNames } from "@talismn/util"
import { DetailedHTMLProps, FC, HTMLAttributes, ReactNode } from "react"
import { NavLink, To } from "react-router-dom"

type NavItemProps = {
  icon: ReactNode
  children: ReactNode
  className?: string
  iconContainerClassName?: string
  contentClassName?: string
  to?: To
  onClick?: () => void
}

const NavItemContent: FC<NavItemProps> = ({
  icon,
  children,
  contentClassName,
  iconContainerClassName,
}) => {
  return (
    <>
      {icon && (
        <div
          className={classNames(
            "flex w-20 shrink-0 justify-center text-lg",
            iconContainerClassName
          )}
        >
          {icon}
        </div>
      )}
      <div className={classNames("flex-grow", contentClassName)}>{children}</div>
    </>
  )
}

const NavItemButton: FC<NavItemProps> = ({ className, ...props }) => {
  return (
    <button
      type="button"
      className={classNames(
        "hover:bg-grey-800 text-body-secondary hover:text-body flex w-full items-center justify-start gap-4 rounded-sm p-4 py-8 text-left",
        className
      )}
      {...props}
    >
      <NavItemContent {...props} />
    </button>
  )
}

const NavItemLink: FC<NavItemProps & { to: To }> = ({ className, ...props }) => {
  return (
    <NavLink
      className={classNames(
        "hover:bg-grey-800 text-body-secondary hover:text-body flex w-full items-center justify-start gap-4 rounded-sm p-4 py-8 text-left",
        "[&.active]:text-body",
        className
      )}
      {...props}
    >
      <NavItemContent {...props} />
    </NavLink>
  )
}

export const NavItem: FC<NavItemProps> = ({ to, ...props }) =>
  to ? <NavItemLink to={to} {...props} /> : <NavItemButton {...props} />

export const Nav: FC<DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>> = ({
  className,
  ...props
}) => (
  <nav className={classNames("flex flex-col items-start justify-start", className)} {...props} />
)
