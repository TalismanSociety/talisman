import { Balance, Balances } from "@talismn/balances"
import { getNetworkGenesisHash, Network, Token } from "@talismn/chaindata-provider"
import { CheckCircleIcon } from "@talismn/icons"
import { cn } from "@talismn/util"
import { Account, getAccountGenesisHash, isAccountCompatibleWithNetwork } from "extension-core"
import { FC, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { AccountTypeIcon } from "@ui/domains/Account/AccountTypeIcon"
import { Address } from "@ui/domains/Account/Address"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { useFormattedAddress } from "@ui/hooks/useFormattedAddress"
import { useAccounts, useBalances, useNetworkById, useSelectedCurrency, useToken } from "@ui/state"

type AccountOption = Account & {
  disabled: boolean
  balances: Balances
}

export const SenderAccountPicker: FC<{
  tokenId: string
  address: string | null
  onSelect: (address: string) => void
}> = ({ address, tokenId, onSelect }) => {
  const { t } = useTranslation()
  const [search, setSearch] = useState("")
  const allAccounts = useAccounts("owned")
  const allBalances = useBalances("owned")
  const token = useToken(tokenId)
  const network = useNetworkById(token?.networkId)

  const accountOptions = useMemo(() => {
    if (!token || !network) return []

    return allAccounts
      .filter((account) => isAccountCompatibleWithNetwork(network, account))
      .map((account): AccountOption => {
        const balances = allBalances.find({ address: account.address, tokenId })
        const disabled = !balances.sum.planck["transferable"]
        return {
          ...account,
          balances,
          disabled,
        }
      })
      .sort((a, b) => {
        const fiat1 = a.balances.sum.fiat("usd")["transferable"] || 0n
        const fiat2 = b.balances.sum.fiat("usd")["transferable"] || 0n
        if (fiat1 > fiat2) return -1
        if (fiat1 < fiat2) return 1

        const planck1 = a.balances.sum.fiat("usd")["transferable"] || 0n
        const planck2 = b.balances.sum.fiat("usd")["transferable"] || 0n
        if (planck1 > planck2) return -1
        if (planck1 < planck2) return 1

        return a.name?.localeCompare(b.name || "") || a.address.localeCompare(b.address)
      })
  }, [token, network, allAccounts, allBalances, tokenId])

  const filteredAccounts = useMemo(() => {
    const ls = search.trim().toLowerCase()
    if (!ls) return accountOptions
    return accountOptions.filter((account) => {
      return account.name?.toLowerCase().includes(ls) || account.address.toLowerCase().includes(ls)
    })
  }, [accountOptions, search])

  if (!token || !network) return null

  return (
    <div className="flex h-full min-h-full w-full flex-col overflow-hidden">
      <div className="flex min-h-fit w-full items-center gap-8 p-8 pt-0">
        <div className="mx-1 grow overflow-hidden px-1">
          <SearchInput onChange={setSearch} placeholder={t("Search by account name")} />
        </div>
      </div>
      <ScrollContainer className="bg-black-secondary border-grey-700 scrollable h-full w-full grow overflow-x-hidden border-t">
        <AccountsList
          accounts={filteredAccounts}
          selected={address}
          onSelect={onSelect}
          network={network}
          token={token}
        />
      </ScrollContainer>
    </div>
  )
}

const AccountsList: FC<{
  accounts: AccountOption[]
  selected: string | null
  onSelect: (address: string) => void
  network: Network
  token: Token
}> = ({ accounts, selected, onSelect, network, token }) => {
  const { t } = useTranslation()
  return (
    <div>
      {accounts?.map((account) => (
        <AccountRow
          key={account.address}
          account={account}
          selected={account.address === selected}
          network={network}
          token={token}
          onClick={() => onSelect(account.address)}
        />
      ))}
      {!accounts?.length && (
        <div className="text-body-secondary flex h-[5.8rem] w-full items-center px-12 text-left">
          {t("No account matches your search")}
        </div>
      )}
    </div>
  )
}

const AccountRow: FC<{
  account: AccountOption
  selected: boolean
  network: Network
  token: Token
  onClick: () => void
}> = ({ account, selected, network, token, onClick }) => {
  const address = useFormattedAddress(account.address, getNetworkGenesisHash(network))

  const balance = useMemo(() => {
    return account.balances.find({
      tokenId: token?.id,
    }).each[0]
  }, [account, token])

  return (
    <button
      type="button"
      onClick={onClick}
      tabIndex={0}
      className={cn(
        "hover:bg-grey-750 focus:bg-grey-700 flex h-[5.8rem] w-full items-center gap-4 px-12 text-left",
        selected && "bg-grey-800 text-body-secondary",
        "disabled:cursor-not-allowed disabled:opacity-50",
      )}
      disabled={account.disabled}
    >
      <AccountIcon
        address={account.address}
        genesisHash={getAccountGenesisHash(account)}
        className="shrink-0 !text-xl"
      />
      <div className="flex grow items-center overflow-hidden">
        <div className="flex w-full flex-col space-y-2 overflow-hidden">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="truncate">
              {account.name ?? (
                <Address address={address} startCharCount={6} endCharCount={6} noTooltip />
              )}
            </div>
            <AccountTypeIcon type={account.type} className="text-primary shrink-0" />
          </div>
          <Address className="text-body-secondary text-xs" address={address} />
        </div>
        {selected && <CheckCircleIcon className="ml-3 inline shrink-0" />}
      </div>
      <AccountTokenBalance token={token} balance={balance} />
    </button>
  )
}

const AccountTokenBalance: FC<{ token: Token; balance?: Balance }> = ({ token, balance }) => {
  const currency = useSelectedCurrency()

  if (!balance || !token) return null

  return (
    <div
      className={cn(
        "space-y-2 whitespace-nowrap text-right text-sm",
        balance.status === "cache" && "animate-pulse",
      )}
    >
      <div>
        <Tokens
          amount={balance.transferable.tokens}
          decimals={token.decimals}
          symbol={token.symbol}
          isBalance
          noCountUp
        />
      </div>
      <div className="text-body-secondary text-xs">
        <Fiat amount={balance.transferable.fiat(currency)} isBalance noCountUp />
      </div>
    </div>
  )
}
