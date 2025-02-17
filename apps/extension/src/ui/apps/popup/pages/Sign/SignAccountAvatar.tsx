import { encodeAnyAddress } from "@talismn/util"
import { Account } from "extension-core"
import { FC } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { AccountIcon } from "@ui/domains/Account/AccountIcon"

export const SignAccountAvatar: FC<{ account?: Account; ss58Format?: number | null }> = ({
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
          genesisHash={"genesisHash" in account ? account.genesisHash : undefined}
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
