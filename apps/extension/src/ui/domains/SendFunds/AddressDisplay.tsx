import { WithTooltip } from "@talisman/components/Tooltip"
import { convertAddress } from "@talisman/util/convertAddress"
import { shortenAddress } from "@talisman/util/shortenAddress"
import useAccountByAddress from "@ui/hooks/useAccountByAddress"
import { useAddressBook } from "@ui/hooks/useAddressBook"
import { FC, useMemo } from "react"

import AccountAvatar from "../Account/Avatar"

type AddressDisplayProps = {
  address?: string | null
  genesisHash?: string | null
  className?: string
}

const useContact = (address?: string | null) => {
  const { contacts } = useAddressBook()

  const result = useMemo(() => {
    if (!address) return null
    const converted = convertAddress(address, null)
    return contacts?.find((c) => convertAddress(c.address, null) === converted) ?? null
  }, [address, contacts])

  return result
}

export const AddressDisplay: FC<AddressDisplayProps> = ({ address, className }) => {
  const account = useAccountByAddress(address)
  const contact = useContact(address)

  const text = useMemo(
    () => account?.name ?? contact?.name ?? shortenAddress(address ?? "", 6, 6),
    [account?.name, address, contact?.name]
  )

  if (!address || !text) return null

  return (
    <WithTooltip tooltip={address} noWrap>
      <div className="text-body inline-flex max-w-full flex-nowrap items-center gap-4 overflow-hidden text-base">
        <AccountAvatar className="!text-lg" address={address} genesisHash={account?.genesisHash} />
        <div className="leading-base grow overflow-hidden text-ellipsis whitespace-nowrap">
          {text}
        </div>
      </div>
    </WithTooltip>
  )
}
