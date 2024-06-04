import { WithTooltip } from "@talisman/components/Tooltip"
import { convertAddress } from "@talisman/util/convertAddress"
import { classNames } from "@talismn/util"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import { useAddressBook } from "@ui/hooks/useAddressBook"
import { useFormattedAddress } from "@ui/hooks/useFormattedAddress"
import { FC, useMemo } from "react"
import { PillButton } from "talisman-ui"

import { AccountIcon } from "../../Account/AccountIcon"
import { AccountTypeIcon } from "../../Account/AccountTypeIcon"
import { Address } from "../../Account/Address"

const useContact = (address?: string | null) => {
  const { contacts } = useAddressBook()

  return useMemo(() => {
    if (!address) return undefined
    const genericAddress = convertAddress(address, null)
    return contacts?.find((c) => convertAddress(c.address, null) === genericAddress)
  }, [address, contacts])
}

type AddressPillButtonProps = {
  address?: string | null
  genesisHash?: string | null
  className?: string
  onClick?: () => void
}

export const AddressPillButton: FC<AddressPillButtonProps> = ({
  address,
  genesisHash,
  className,
  onClick,
}) => {
  const account = useAccountByAddress(address as string)
  const contact = useContact(address)

  const { name, genesisHash: accountGenesisHash } = useMemo(() => {
    if (account) return account
    if (contact) return { name: contact.name, genesisHash: contact.genesisHash }
    return { name: undefined, genesisHash: undefined }
  }, [account, contact])

  const formattedAddress = useFormattedAddress(
    address ?? undefined,
    genesisHash ?? accountGenesisHash
  )
  const displayAddress = useMemo(
    () => (account ? formattedAddress : address) ?? undefined,
    [account, address, formattedAddress]
  )

  if (!address) return null

  return (
    <PillButton className={classNames("h-16 max-w-full !px-4", className)} onClick={onClick}>
      <div className="text-body flex h-16 max-w-full flex-nowrap items-center gap-4 overflow-x-hidden text-base">
        <AccountIcon className="!text-lg" address={address} genesisHash={accountGenesisHash} />
        <div className="leading-base grow truncate">
          {name ? (
            <WithTooltip tooltip={displayAddress}>{name}</WithTooltip>
          ) : (
            <Address address={displayAddress} startCharCount={6} endCharCount={6} />
          )}
        </div>
        <AccountTypeIcon origin={account?.origin} className="text-primary-500" />
      </div>
    </PillButton>
  )
}
