import { UserIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC, useMemo } from "react"
import { PillButton } from "talisman-ui"

import { WithTooltip } from "@talisman/components/Tooltip"
import { useFormattedAddress } from "@ui/hooks/useFormattedAddress"
import { useAccountByAddress } from "@ui/state"

import { AccountIcon } from "../../Account/AccountIcon"
import { AccountTypeIcon } from "../../Account/AccountTypeIcon"
import { Address } from "../../Account/Address"

type AccountPillButtonProps = {
  address?: string | null
  genesisHash?: string | null
  className?: string
  onClick?: () => void
}

export const BondAccountPillButton: FC<AccountPillButtonProps> = ({
  address,
  genesisHash: tokenGenesisHash,
  className,
  onClick,
}) => {
  const account = useAccountByAddress(address as string)

  const { name, genesisHash: accountGenesisHash } = useMemo(() => {
    if (account) return account
    return { name: undefined, genesisHash: undefined }
  }, [account])

  const formattedAddress = useFormattedAddress(
    address ?? undefined,
    tokenGenesisHash ?? accountGenesisHash,
  )
  const displayAddress = useMemo(
    () => (account ? formattedAddress : address) ?? undefined,
    [account, address, formattedAddress],
  )

  return (
    <PillButton className={classNames("h-16 max-w-full rounded px-4", className)} onClick={onClick}>
      <div className="text-body flex h-16 max-w-full flex-nowrap items-center gap-4 overflow-x-hidden text-base">
        {address ? (
          <AccountIcon className="!text-lg" address={address} genesisHash={accountGenesisHash} />
        ) : (
          <UserIcon />
        )}
        {account ? (
          <div className="leading-base grow truncate">
            {name ? (
              <WithTooltip tooltip={displayAddress}>{name}</WithTooltip>
            ) : (
              <Address address={displayAddress} startCharCount={6} endCharCount={6} />
            )}
          </div>
        ) : (
          "Select account"
        )}
        <AccountTypeIcon origin={account?.origin} className="text-primary-500" />
      </div>
    </PillButton>
  )
}
