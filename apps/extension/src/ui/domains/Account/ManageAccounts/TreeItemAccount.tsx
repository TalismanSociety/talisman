import { classNames } from "@talismn/util"
import { FC, useMemo } from "react"

import { AccountJsonAny } from "@extension/core"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { AccountTypeIcon } from "@ui/domains/Account/AccountTypeIcon"
import { Address } from "@ui/domains/Account/Address"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { useFormattedAddressForAccount } from "@ui/hooks/useFormattedAddress"

import { AccountContextMenu } from "../AccountContextMenu"

export const TreeItemAccount: FC<{
  accounts: AccountJsonAny[]
  address: string
  balanceTotalPerAccount: Record<string, number>
  isInFolder?: boolean
  noTooltip?: boolean
}> = ({ accounts, address, balanceTotalPerAccount, isInFolder, noTooltip }) => {
  const account = useMemo(
    () => accounts.find((account) => account.address === address),
    [accounts, address],
  )
  const balanceTotal = balanceTotalPerAccount[account?.address ?? ""] ?? 0
  const formattedAddress = useFormattedAddressForAccount(account)

  if (!account) return null

  return (
    <div className={classNames("@container relative flex items-center")}>
      <div
        className={classNames(
          "flex h-[5.9rem] flex-grow items-center gap-8 overflow-hidden rounded-sm border-[1px] border-transparent px-8",
          isInFolder ? "bg-grey-800 pr-4" : "bg-grey-850",
        )}
      >
        <AccountIcon className="text-xl" address={address} genesisHash={account?.genesisHash} />
        <div className="flex grow flex-col gap-2 overflow-hidden">
          <div className="flex items-center gap-2">
            <div className="overflow-hidden text-ellipsis whitespace-nowrap">{account.name}</div>
            <AccountTypeIcon
              className="text-primary"
              origin={account.origin}
              signetUrl={account.signetUrl as string}
            />
          </div>
          <div className="text-body-secondary @2xl:text-sm text-xs">
            <Address address={formattedAddress} noTooltip={noTooltip} />
          </div>
        </div>
        <div className="@2xl:flex hidden flex-col gap-2">
          <Fiat amount={balanceTotal} isBalance noCountUp />
        </div>

        <div data-no-dnd="true">
          <AccountContextMenu
            analyticsFrom="settings - accounts"
            address={address}
            hideManageAccounts
          />
        </div>
      </div>
    </div>
  )
}
