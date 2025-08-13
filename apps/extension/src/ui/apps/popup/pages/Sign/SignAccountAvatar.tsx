import { encodeAnyAddress } from "@talismn/crypto"
import { getAccountGenesisHash } from "@talismn/keyring"
import { Account } from "extension-core"
import { FC } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { AccountIcon } from "@ui/domains/Account/AccountIcon"

export const SignAccountAvatar: FC<{ account?: Account; ss58Format?: number }> = ({
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
          genesisHash={getAccountGenesisHash(account)}
        />
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-body font-semibold">{account.name}</div>
        <div className="text-body-secondary">
          {encodeAnyAddress(account.address, { ss58Format })}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
