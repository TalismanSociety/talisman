import { classNames } from "@talismn/util"
import { getAccountGenesisHash } from "extension-core"
import { FC, useMemo } from "react"
import { PillButton, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { useFormattedAddress } from "@ui/hooks/useFormattedAddress"
import { useAccountByAddress } from "@ui/state"

import { AccountIcon } from "./AccountIcon"
import { AccountTypeIcon } from "./AccountTypeIcon"
import { Address } from "./Address"

type AddressPillButtonProps = {
  address?: string | null
  genesisHash?: `0x${string}` | null
  className?: string
  onClick?: () => void
}

export const AddressPillButton: FC<AddressPillButtonProps> = ({
  address,
  genesisHash: tokenGenesisHash, // used for address format
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
    tokenGenesisHash ?? accountGenesisHash,
  )
  const displayAddress = useMemo(
    () => (account ? formattedAddress : address) ?? undefined,
    [account, address, formattedAddress],
  )

  if (!address) return null

  return (
    <PillButton className={classNames("h-16 max-w-full !px-4", className)} onClick={onClick}>
      <div className="text-body flex h-16 max-w-full flex-nowrap items-center gap-4 overflow-x-hidden text-base">
        <AccountIcon className="!text-lg" address={address} genesisHash={accountGenesisHash} />
        <div className="leading-base grow truncate">
          {name ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>{name}</span>
              </TooltipTrigger>
              <TooltipContent>{displayAddress}</TooltipContent>
            </Tooltip>
          ) : (
            <Address address={displayAddress} startCharCount={6} endCharCount={6} />
          )}
        </div>
        <AccountTypeIcon type={account?.type} className="text-primary-500" />
      </div>
    </PillButton>
  )
}
