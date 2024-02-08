import { classNames } from "@talismn/util"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { AccountTypeIcon } from "@ui/domains/Account/AccountTypeIcon"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import { useTranslation } from "react-i18next"

export const PortfolioAccount = ({
  address,
  className,
}: {
  address: string
  className?: string
}) => {
  const { t } = useTranslation()
  const account = useAccountByAddress(address)
  if (!account) return null
  return (
    <div className={classNames("flex items-center gap-3", className)}>
      <AccountIcon className="!text-[1em]" address={address} genesisHash={account?.genesisHash} />
      <div className="max-w-lg overflow-hidden text-ellipsis whitespace-nowrap">
        {account.name ?? t("Unknown")}
      </div>
      <AccountTypeIcon
        className="text-primary"
        origin={account?.origin}
        signetUrl={account.signetUrl as string}
      />
    </div>
  )
}
