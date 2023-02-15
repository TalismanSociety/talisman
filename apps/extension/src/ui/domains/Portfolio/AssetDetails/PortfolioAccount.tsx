import { ParitySignerIcon, UsbIcon } from "@talisman/theme/icons"
import { classNames } from "@talismn/util"
import AccountAvatar from "@ui/domains/Account/Avatar"
import { AccountTypeIcon } from "@ui/domains/Account/NamedAddress"
import useAccountByAddress from "@ui/hooks/useAccountByAddress"

export const PortfolioAccount = ({
  address,
  className,
}: {
  address: string
  className?: string
}) => {
  const account = useAccountByAddress(address)
  if (!account) return null
  return (
    <div className={classNames("flex gap-3", className)}>
      <div>
        <AccountAvatar
          className="!text-[1em]"
          address={address}
          genesisHash={account?.genesisHash}
        />
      </div>
      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
        {account.name ?? "Unnknown"}
      </div>
      <AccountTypeIcon className="text-primary" origin={account?.origin} />
    </div>
  )
}
