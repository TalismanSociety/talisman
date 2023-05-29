import { AccountJsonAny } from "@core/domains/accounts/types"
import { encodeAnyAddress } from "@talismn/util"
import AccountAvatar from "@ui/domains/Account/Avatar"
import { FC } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

export const SignAccountAvatar: FC<{ account?: AccountJsonAny; ss58Format?: number | null }> = ({
  account,
  ss58Format,
}) => {
  if (!account) return null

  return (
    <Tooltip placement="bottom-end">
      <TooltipTrigger>
        <AccountAvatar address={account.address} genesisHash={account.genesisHash} />
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-body font-semibold">{account.name}</div>
        <div className="text-body-secondary">
          {encodeAnyAddress(account.address, ss58Format ?? undefined)}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
