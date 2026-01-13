import { WithTooltip } from "@talisman/components/Tooltip"
import { classNames } from "@talismn/util"
import { useFormattedAddress } from "@ui/hooks/useFormattedAddress"
import { useAccountByAddress } from "@ui/state"
import { getAccountGenesisHash } from "extension-core"
import { type FC, useMemo } from "react"
import { PillButton } from "talisman-ui"

import { AccountIcon } from "../../Account/AccountIcon"
import { AccountTypeIcon } from "../../Account/AccountTypeIcon"
import { Address } from "../../Account/Address"

type AddressPillButtonProps = {
  address?: string | null
  genesisHash?: `0x${string}` | null
  className?: string
  onClick?: () => void
}

export const AddressPillButton: FC<AddressPillButtonProps> = ({
  address,
  genesisHash: tokenGenesisHash,
  className,
  onClick,
}) => {
  const account = useAccountByAddress(address as string)

  const { name, genesisHash: accountGenesisHash } = useMemo(() => {
    if (account) return { name: account.name, genesisHash: getAccountGenesisHash(account) }
    return { name: undefined, genesisHash: undefined }
  }, [account])

  const formattedAddress = useFormattedAddress(
    address ?? undefined,
    tokenGenesisHash ?? accountGenesisHash
  )
  const displayAddress = useMemo(
    () => (account ? formattedAddress : address) ?? undefined,
    [account, address, formattedAddress]
  )

  if (!address) return null

  return (
    <PillButton className={classNames("!px-4 h-16 max-w-full", className)} onClick={onClick}>
      <div className="flex h-16 max-w-full flex-nowrap items-center gap-4 overflow-x-hidden text-base text-body">
        <AccountIcon className="!text-lg" address={address} genesisHash={accountGenesisHash} />
        <div className="grow truncate leading-base">
          {name ? (
            <WithTooltip tooltip={displayAddress}>{name}</WithTooltip>
          ) : (
            <Address address={displayAddress} startCharCount={6} endCharCount={6} />
          )}
        </div>
        <AccountTypeIcon type={account?.type} className="text-primary-500" />
      </div>
    </PillButton>
  )
}
