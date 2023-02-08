import { UsbIcon } from "@talisman/theme/icons"
import AccountAvatar from "@ui/domains/Account/Avatar"
import useAccountByAddress from "@ui/hooks/useAccountByAddress"
import { classNames } from "talisman-ui"

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
      {!!account?.isHardware && (
        <div className="text-primary">
          <UsbIcon />
        </div>
      )}
    </div>
  )
}
