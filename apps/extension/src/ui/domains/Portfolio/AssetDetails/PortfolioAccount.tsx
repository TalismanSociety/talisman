import { getAccountGenesisHash, getAccountSignetUrl } from "@core/domains/keyring/exports"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { AccountTypeIcon } from "@ui/domains/Account/AccountTypeIcon"
import { useAccountByAddress } from "@ui/state/accounts"
import { cn } from "@ui/util/cn"
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
    <div className={cn("flex items-center gap-3", className)}>
      <AccountIcon
        className="text-[1em]!"
        address={address}
        genesisHash={getAccountGenesisHash(account)}
      />
      <div className="max-w-lg overflow-hidden text-ellipsis whitespace-nowrap">
        {account.name ?? t("Unknown")}
      </div>
      <AccountTypeIcon
        className="text-primary"
        type={account?.type}
        signetUrl={getAccountSignetUrl(account)}
      />
    </div>
  )
}
