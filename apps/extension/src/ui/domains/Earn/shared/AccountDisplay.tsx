import { encodeAnyAddress } from "@talismn/crypto"
import { cn } from "@talismn/util"
import { FC, useMemo } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { AccountTypeIcon } from "@ui/domains/Account/AccountTypeIcon"
import { Address } from "@ui/domains/Account/Address"
import { useAccountByAddress } from "@ui/state"

export const AccountDisplay: FC<{
  address: string
  ss58Format?: number
  className?: string
  iconClassName?: string
  textClassName?: string
}> = ({ address, ss58Format, className, iconClassName, textClassName }) => {
  const formattedAddress = useMemo(
    () => encodeAnyAddress(address, { ss58Format }),
    [address, ss58Format],
  )

  const account = useAccountByAddress(address)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex max-w-full items-center gap-[0.5em] overflow-hidden",
            className,
          )}
        >
          <AccountIcon className={cn("text-[1.5em]", iconClassName)} address={formattedAddress} />
          <span className={cn("max-w-full truncate", textClassName)}>
            {account?.name ?? <Address address={formattedAddress} noTooltip />}
          </span>
          <AccountTypeIcon type={account?.type} className="text-primary-500 shrink-0" />
        </span>
      </TooltipTrigger>
      <TooltipContent>{formattedAddress}</TooltipContent>
    </Tooltip>
  )
}
