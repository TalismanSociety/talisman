import { CheckCircleIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useVirtualizer } from "@tanstack/react-virtual"
import { Account, getAccountGenesisHash } from "extension-core"
import { HexString } from "polkadot-api"
import { FC, useState } from "react"
import { useTranslation } from "react-i18next"

import { ScrollContainer, useScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { AccountTypeIcon } from "@ui/domains/Account/AccountTypeIcon"
import { Address } from "@ui/domains/Account/Address"
import { useFormattedAddress } from "@ui/hooks/useFormattedAddress"

import { RampLayout } from "./RampLayout"

export const RampAccountPicker: FC<{
  accounts: Account[] | undefined
  /** Used to format addresses */
  genesisHash: HexString | null | undefined
  selected: string | undefined
  onSelect: (address: string) => void
  onClose: () => void
}> = ({ accounts, genesisHash, selected, onClose, onSelect }) => {
  const { t } = useTranslation()
  const [, setSearch] = useState("")

  // TODO sort and filter

  return (
    <RampLayout onBackClick={onClose} title={t("Select an account")}>
      <div className="flex h-full min-h-full w-full flex-col overflow-hidden">
        <div className="flex min-h-fit w-full items-center gap-8 px-12 pb-8">
          <SearchInput onChange={setSearch} placeholder={t("Search")} />
        </div>
        <ScrollContainer className="bg-black-secondary border-grey-700 scrollable h-full w-full grow overflow-x-hidden border-t">
          {!accounts?.length ? (
            <div>no comp account</div>
          ) : (
            <AccountsList
              accounts={accounts}
              genesisHash={genesisHash}
              onSelect={onSelect}
              selected={selected}
            />
          )}
        </ScrollContainer>
      </div>
    </RampLayout>
  )
}

const AccountsList: FC<{
  accounts: Account[]
  /** Used to format addresses */
  genesisHash: HexString | null | undefined
  selected: string | undefined
  onSelect: (address: string) => void
}> = ({ accounts, genesisHash, selected, onSelect }) => {
  const refContainer = useScrollContainer()

  const virtualizer = useVirtualizer({
    count: accounts.length,
    estimateSize: () => 58,
    overscan: 5,
    getScrollElement: () => refContainer.current,
  })

  if (!accounts.length) return null

  return (
    <div>
      <div
        className="relative w-full"
        style={{
          height: `${virtualizer.getTotalSize()}px`,
        }}
      >
        {virtualizer.getVirtualItems().map((item) => {
          const account = accounts[item.index]
          if (!account) return null

          return (
            <div
              key={item.key}
              className="absolute left-0 top-0 w-full"
              style={{
                height: `${item.size}px`,
                transform: `translateY(${item.start}px)`,
              }}
            >
              <AccountButtonRow
                key={item.key}
                isSelected={account.address === selected}
                account={account}
                genesisHash={genesisHash}
                onClick={() => onSelect(account.address)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

const AccountButtonRow: FC<{
  account: Account
  /** Used to format addresses */
  genesisHash: HexString | null | undefined
  isSelected: boolean
  onClick: () => void
}> = ({ account, genesisHash, isSelected, onClick }) => {
  const address = useFormattedAddress(account?.address, genesisHash)

  return (
    <button
      type="button"
      onClick={onClick}
      tabIndex={0}
      className={classNames(
        "hover:bg-grey-750 focus:bg-grey-700 flex h-[5.8rem] w-full items-center gap-4 px-12 text-left",
        isSelected && "bg-grey-800 text-body-secondary",
        "disabled:cursor-not-allowed disabled:opacity-50",
      )}
    >
      <AccountIcon
        address={account.address}
        genesisHash={getAccountGenesisHash(account)}
        className="!text-xl"
      />
      <div className="flex grow items-center justify-between overflow-hidden">
        <div className="flex flex-col space-y-2">
          <div className="flex items-center gap-2">
            <div className="truncate">
              {account.name ?? (
                <Address address={address} startCharCount={6} endCharCount={6} noTooltip />
              )}
            </div>
            <AccountTypeIcon type={account.type} className="text-primary" />
          </div>
          <Address className="text-body-secondary text-xs" address={address} />
        </div>
        {isSelected && <CheckCircleIcon className="ml-3 inline shrink-0" />}
      </div>
      {/* {(showBalances || showTotalBalance) && (
        <AccountTokenBalance
          token={token}
          balance={account.balance}
          total={account.total}
          showTotalBalance={showTotalBalance}
          showBalances={showBalances}
        />
      )} */}
    </button>
  )
}
