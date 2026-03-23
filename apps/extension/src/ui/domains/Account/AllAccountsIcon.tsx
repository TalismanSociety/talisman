import { UsersIcon } from "@talismn/icons"
import { classNames } from "@ui/util/cn"

import type { ReactNode } from "react"

export const AllAccountsIcon = ({ className }: { className?: string }) => (
  <AccountsIconContainer className={className}>
    <UsersIcon className="w-full text-primary" />
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
      "flex h-[1em] w-[1em] items-center justify-center rounded-full bg-grey-750 p-[0.25em]",
      className
    )}
  >
    {children}
  </div>
)
