import { UsersIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { ReactNode } from "react"

export const AllAccountsIcon = ({ className }: { className?: string }) => (
  <AccountsIconContainer className={className}>
    <UsersIcon className="text-primary w-full" />
  </AccountsIconContainer>
)

export const AccountsIconContainer = ({
  className,
  children,
}: {
  className?: string
  children?: ReactNode
}) => (
  <div
    className={classNames(
      "bg-grey-750 flex h-[1em] w-[1em] items-center justify-center rounded-full p-[0.25em]",
      className
    )}
  >
    {children}
  </div>
)
