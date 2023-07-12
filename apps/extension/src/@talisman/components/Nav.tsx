import { classNames } from "@talismn/util"
import { DetailedHTMLProps, FC, HTMLAttributes, ReactNode } from "react"
import { NavLink, NavLinkProps } from "react-router-dom"

type NavItemCommonProps = {
  icon?: ReactNode
  children?: ReactNode
  className?: string
}

type NavItemButtonProps = HTMLAttributes<HTMLButtonElement> & NavItemCommonProps

export const NavItemButton: FC<NavItemButtonProps> = ({ icon, className, children, ...props }) => {
  return (
    <button
      type="button"
      className={classNames(
        "hover:bg-grey-800 text-body-secondary hover:text-body flex h-28 w-full items-center justify-start gap-4 rounded-sm px-4 text-left",
        className
      )}
      {...props}
    >
      {icon && <div className="flex w-20 shrink-0 justify-center text-lg">{icon}</div>}
      <div className="flex-grow">{children}</div>
    </button>
  )
}

export const NavItemLink: FC<NavLinkProps & NavItemButtonProps> = ({
  icon,
  className,
  children,
  ...props
}) => {
  return (
    <NavLink
      className={classNames(
        "hover:bg-grey-800 text-body-secondary hover:text-body flex h-28 w-full items-center justify-start gap-4 rounded-sm px-4 text-left",
        className
      )}
      {...props}
    >
      {icon && <div className="flex w-20 shrink-0 justify-center text-lg">{icon}</div>}
      <div className="flex-grow">{children}</div>
    </NavLink>
  )
}

export const Nav: FC<DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>> = ({
  className,
  ...props
}) => (
  <nav className={classNames("flex flex-col items-start justify-start", className)} {...props} />
)
