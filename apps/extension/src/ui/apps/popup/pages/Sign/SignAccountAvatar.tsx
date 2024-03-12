import { AccountJsonAny } from "@extension/core"
import { encodeAnyAddress } from "@talismn/util"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { FC } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

export const SignAccountAvatar: FC<{ account?: AccountJsonAny; ss58Format?: number | null }> = ({
  account,
  ss58Format,
}) => {
  if (!account) return null

  return (
    <Tooltip placement="bottom-end">
      <TooltipTrigger className="inline-block">
        <AccountIcon
          className="text-xl"
          address={account.address}
          genesisHash={account.genesisHash}
        />
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
