import { classNames } from "@talismn/util"
import { AccountTypeIcon } from "@ui/domains/Account/AccountTypeIcon"
import AccountAvatar from "@ui/domains/Account/Avatar"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import { useTranslation } from "react-i18next"

export const PortfolioAccount = ({
  address,
  className,
}: {
  address: string
  className?: string
}) => {
  const { t } = useTranslation("portfolio")
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
      <div className="max-w-lg overflow-hidden text-ellipsis whitespace-nowrap">
        {account.name ?? t("Unknown")}
      </div>
      <AccountTypeIcon className="text-primary" origin={account?.origin} />
    </div>
  )
}
