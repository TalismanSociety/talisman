import type { TreeFolder } from "@core/domains/accounts/helpers.catalog"
import type { Account } from "@core/domains/keyring/exports"
import { getAccountGenesisHash } from "@core/domains/keyring/exports"
import { FolderIcon, MoreHorizontalIcon } from "@talismn/icons"
import { TalismanOrbRectangle } from "@talismn/orb"
import { classNames } from "@talismn/util"
import type { AnalyticsPage } from "@ui/api/analytics"
import { DashboardTopActions } from "@ui/apps/dashboard/DashboardTopActions"
import { ContextMenuTrigger } from "@ui/components/ContextMenu"
import { IconButton } from "@ui/components/IconButton"
import { AccountContextMenu } from "@ui/domains/Account/AccountContextMenu"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { AccountTypeIcon } from "@ui/domains/Account/AccountTypeIcon"
import { AllAccountsIcon } from "@ui/domains/Account/AllAccountsIcon"
import { FolderContextMenu } from "@ui/domains/Account/FolderContextMenu"
import { currencyConfig } from "@ui/domains/Asset/currencyConfig"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { useToggleCurrency } from "@ui/hooks/useToggleCurrency"
import { useBalanceTotals } from "@ui/state/balanceTotals"
import { useSelectedCurrency } from "@ui/state/settings"
import { shortenAddress } from "@ui/util/shortenAddress"
import { type FC, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { usePortfolioNavigation } from "./usePortfolioNavigation"

const SelectionScope: FC<{ account: Account | null; folder?: TreeFolder | null }> = ({
  account,
  folder,
}) => {
  const { t } = useTranslation()

  if (account)
    return (
      <div className="flex h-14 w-full items-center gap-6 text-base">
        <div className="flex h-14 grow items-center gap-3 overflow-hidden">
          <AccountIcon
            className="shrink-0 text-[1.25rem]"
            address={account.address}
            genesisHash={getAccountGenesisHash(account)}
          />
          <div className="truncate">{account.name ?? shortenAddress(account.address)}</div>
          <AccountTypeIcon type={account.type} className="text-primary" />
        </div>
        <div className="shrink-0">
          <AccountContextMenu
            address={account.address}
            analyticsFrom="dashboard portfolio"
            placement="bottom-end"
            trigger={
              <IconButton className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-grey-800/50 hover:bg-grey-800/80">
                <MoreHorizontalIcon className="text-base" />
              </IconButton>
            }
          />
        </div>
      </div>
    )

  if (folder)
    return (
      <div className="flex h-14 w-full items-center gap-6 text-base">
        <div className="flex grow items-center gap-3 overflow-hidden text-base">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xs bg-grey-800">
            <FolderIcon className="shrink-0 text-primary text-xs" />
          </div>
          <div className="truncate">{folder.name}</div>
        </div>
        <div className="shrink-0">
          <FolderContextMenu
            folderId={folder.id}
            placement="bottom-end"
            trigger={
              <ContextMenuTrigger className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-grey-800/50 hover:bg-grey-800/80">
                <MoreHorizontalIcon className="text-base" />
              </ContextMenuTrigger>
            }
          />
        </div>
      </div>
    )

  return (
    <div className="flex h-14 items-center gap-3 text-base">
      <AllAccountsIcon className="shrink-0 text-[1.25rem]" />
      <div>{t("All Accounts")}</div>
    </div>
  )
}

export const DashboardPortfolioHeader: FC<{ className?: string }> = ({ className }) => {
  const { selectedAccount, selectedAccounts, selectedFolder } = usePortfolioNavigation()
  const balanceTotals = useBalanceTotals()

  const currency = useSelectedCurrency()
  const toggleCurrency = useToggleCurrency()

  const selectedTotal = useMemo(() => {
    return selectedAccounts.reduce((total, acc) => total + (balanceTotals[acc.address] ?? 0), 0)
  }, [selectedAccounts, balanceTotals])

  return (
    <div
      className={classNames(
        "relative z-0 flex h-[12rem] flex-col items-start justify-between rounded-lg bg-grey-900 p-10",
        className
      )}
    >
      {!!selectedAccounts.length && (
        <TalismanOrbRectangle
          seed={selectedAccounts?.[0]?.address}
          className="absolute top-0 left-0 z-0 size-full select-none rounded-sm opacity-30"
        />
      )}
      <div className="z-1 flex w-full flex-col gap-4 overflow-hidden font-inter">
        <SelectionScope folder={selectedFolder} account={selectedAccount} />
        <div className="flex w-full max-w-full items-center gap-6">
          <button
            type="button"
            className={classNames(
              "pointer-events-auto flex size-[2.75rem] shrink-0 items-center justify-center rounded-full bg-grey-700/20 text-center text-grey-200 text-lg leading-none shadow-[inset_0px_0px_1px_rgb(228_228_228/1)] transition-[box-shadow,color,background-color] duration-200 ease-out hover:bg-body/10 hover:text-body hover:shadow-[inset_0px_0px_2px_rgb(250_250_250/1)]",
              currencyConfig[currency]?.symbol?.length === 2 && "text-md",
              currencyConfig[currency]?.symbol?.length > 2 && "text-base"
            )}
            onClick={(event) => {
              event.stopPropagation()
              toggleCurrency()
            }}
          >
            {currencyConfig[currency]?.symbol}
          </button>
          <Fiat
            className={classNames(
              "overflow-hidden text-ellipsis whitespace-pre pr-10 font-bold font-inter text-[3rem] leading-[3rem]"
            )}
            amount={selectedTotal}
            isBalance
            currencyDisplay="code"
          />
        </div>
      </div>
      <DashboardTopActions analyticsPage={ANALYTICS_PAGE} className="z-1" />
    </div>
  )
}

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Popup",
  feature: "Portfolio",
  featureVersion: 2,
  page: "Portfolio Home",
}
