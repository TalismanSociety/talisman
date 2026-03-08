import type { Account } from "@core/domains/keyring/exports"
import { encodeAnyAddress } from "@talismn/crypto"
import { getAccountGenesisHash } from "@talismn/keyring"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import type { FC } from "react"

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
        <div className="font-semibold text-body">{account.name}</div>
        <div className="text-body-secondary">
          {encodeAnyAddress(account.address, { ss58Format })}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
