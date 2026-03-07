import { Address } from "@ui/domains/Account/Address"
import { useAccountByAddress } from "@ui/state/accounts"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/talisman-ui/components/Tooltip"
import type { FC } from "react"

export const AccountNameOrAddress: FC<{ address: string }> = ({ address }) => {
  const account = useAccountByAddress(address)

  if (account) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span>{account.name}</span>
        </TooltipTrigger>
        <TooltipContent>{account.address}</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Address
      className="text-body-secondary"
      startCharCount={6}
      endCharCount={6}
      address={address}
      noOnChainId
    />
  )
}
