import { BalanceFormatter, Balances, BalancesResult } from "@talismn/balances"
import { Token } from "@talismn/chaindata-provider"
import { isAddressEqual } from "@talismn/crypto"
import { CheckCircleIcon } from "@talismn/icons"
import { TokenRatesList } from "@talismn/token-rates"
import { classNames } from "@talismn/util"
import { useVirtualizer } from "@tanstack/react-virtual"
import { Account, getAccountGenesisHash } from "extension-core"
import { FC, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useOpenCloseStatus } from "talisman-ui"

import { ScrollContainer, useScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { AccountTypeIcon } from "@ui/domains/Account/AccountTypeIcon"
import { Address } from "@ui/domains/Account/Address"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { useFormattedAddress } from "@ui/hooks/useFormattedAddress"
import { useSelectedCurrency } from "@ui/state"

import { RampsPickerLayout } from "./RampsPickerLayout"

export type RampAccountPickerBalancesDisplayMode = "transferable" | "total"

export const RampsAccountPicker: FC<{
  accounts: Account[]
  token: Token | null | undefined
  balances: Balances | null | undefined
  tokenRates: TokenRatesList | null | undefined
  balancesDisplayMode?: RampAccountPickerBalancesDisplayMode
  balancesLoadingStatus: BalancesResult["status"]

  /** Used to format addresses */
  genesisHash: `0x${string}` | null | undefined
  selected: string | undefined

  onSelect: (address: string) => void
  onClose: () => void
}> = ({
  accounts,
  token,
  balances,
  tokenRates,
  balancesDisplayMode = "total",
  balancesLoadingStatus,
  genesisHash,
  selected,
  onClose,
  onSelect,
}) => {
  const { t } = useTranslation()
  const [search, setSearch] = useState("")

  // snapshot on mount so entries dont move when selection changes
  const [sortedAccounts] = useState(() =>
    accounts.concat().sort((a1, a2) => {
      if (a1.address === selected) return -1
      if (a2.address === selected) return 1

      return a1.name.localeCompare(a2.name)
    }),
  )

  const filteredAccounts = useMemo(() => {
    const ls = search.toLowerCase()
    return sortedAccounts.filter(
      (account) =>
        account.address.toLowerCase().includes(ls) || account.name.toLowerCase().includes(ls),
    )
  }, [search, sortedAccounts])

  // once drawer is open, focus on the search input
  const refSearchInput = useRef<HTMLInputElement>(null)
  const transitionStatus = useOpenCloseStatus()
  useEffect(() => {
    if (transitionStatus === "open") refSearchInput.current?.focus()
  }, [transitionStatus])

  return (
    <RampsPickerLayout onBackClick={onClose} title={t("Select an account")}>
      <div className="flex h-full min-h-full w-full flex-col overflow-hidden">
        <div className="flex min-h-fit w-full items-center gap-8 px-12 pb-8">
          <SearchInput ref={refSearchInput} onChange={setSearch} placeholder={t("Search")} />
        </div>
        <ScrollContainer className="bg-black-secondary border-grey-700 scrollable h-full w-full grow overflow-x-hidden border-t">
          {
            <AccountsList
              accounts={filteredAccounts}
              token={token}
              balances={balances}
              tokenRates={tokenRates}
              balancesDisplayMode={balancesDisplayMode}
              balancesLoadingStatus={balancesLoadingStatus}
              genesisHash={genesisHash}
              selected={selected}
              onSelect={onSelect}
            />
          }
        </ScrollContainer>
      </div>
    </RampsPickerLayout>
  )
}

const AccountsList: FC<{
  accounts: Account[]
  token: Token | null | undefined
  balances: Balances | null | undefined
  tokenRates: TokenRatesList | null | undefined
  balancesDisplayMode: RampAccountPickerBalancesDisplayMode
  balancesLoadingStatus: BalancesResult["status"]
  /** Used to format addresses */
  genesisHash: `0x${string}` | null | undefined
  selected: string | undefined
  onSelect: (address: string) => void
}> = ({
  accounts,
  token,
  balances,
  tokenRates,
  balancesDisplayMode,
  balancesLoadingStatus,
  genesisHash,
  selected,
  onSelect,
}) => {
  const { t } = useTranslation()
  const { ref: refContainer } = useScrollContainer()

  const virtualizer = useVirtualizer({
    count: accounts?.length ?? 0,
    estimateSize: () => 58,
    overscan: 5,
    getScrollElement: () => refContainer.current,
  })

  if (!accounts?.length)
    return (
      <div className="text-body-secondary p-12 text-center text-base">
        {t("No accounts match your search")}
      </div>
    )

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
                token={token}
                balances={balances}
                tokenRates={tokenRates}
                balancesDisplayMode={balancesDisplayMode}
                balancesLoadingStatus={balancesLoadingStatus}
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
  token: Token | null | undefined
  balances: Balances | null | undefined
  tokenRates: TokenRatesList | null | undefined
  balancesDisplayMode: RampAccountPickerBalancesDisplayMode
  balancesLoadingStatus: BalancesResult["status"]
  /** Used to format addresses */
  genesisHash: `0x${string}` | null | undefined
  isSelected: boolean
  onClick: () => void
}> = ({
  account,
  token,
  tokenRates,
  balances,
  balancesDisplayMode,
  balancesLoadingStatus,
  genesisHash,
  isSelected,
  onClick,
}) => {
  const address = useFormattedAddress(account?.address, genesisHash)

  return (
    <button
      type="button"
      onClick={onClick}
      tabIndex={0}
      className={classNames(
        "hover:bg-grey-750 focus:bg-grey-700 flex h-[5.8rem] w-full items-center gap-4 overflow-hidden px-12 text-left",
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
        <div className="flex grow flex-col space-y-2 overflow-hidden">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="truncate">{account.name}</div>
            <AccountTypeIcon type={account.type} className="text-primary shrink-0" />
          </div>
          <Address
            className="text-body-secondary text-xs"
            address={address}
            genesisHash={genesisHash}
            startCharCount={8}
            endCharCount={8}
          />
        </div>
        {isSelected && <CheckCircleIcon className="ml-3 inline shrink-0" />}
      </div>
      <AccountTokenBalance
        address={account.address}
        token={token}
        balances={balances}
        tokenRates={tokenRates}
        displayMode={balancesDisplayMode}
        loadingStatus={balancesLoadingStatus}
      />
    </button>
  )
}

const AccountTokenBalance: FC<{
  address: string
  token: Token | null | undefined
  tokenRates: TokenRatesList | null | undefined
  balances: Balances | null | undefined
  displayMode: RampAccountPickerBalancesDisplayMode
  loadingStatus: BalancesResult["status"]
}> = ({ address, token, tokenRates, balances, displayMode, loadingStatus }) => {
  const currency = useSelectedCurrency()

  const balance = useMemo(() => {
    if (!token || !balances) return null

    const bal = balances.find((b) => b.tokenId === token.id && isAddressEqual(b.address, address))
    if (!bal) return null

    return new BalanceFormatter(bal.sum.planck[displayMode], token.decimals, tokenRates?.[token.id])
  }, [address, balances, displayMode, token, tokenRates])

  if (!balance || !token) return null

  return (
    <div
      className={classNames(
        "space-y-2 whitespace-nowrap text-right text-sm",
        loadingStatus !== "live" && "animate-pulse",
      )}
    >
      <div>
        <Tokens
          amount={balance?.tokens}
          decimals={token.decimals}
          symbol={token.symbol}
          isBalance
          noCountUp
        />
      </div>
      <div className="text-body-secondary text-xs">
        <Fiat amount={balance?.fiat(currency)} isBalance noCountUp />
      </div>
    </div>
  )
}
