import { ChevronLeftIcon } from "@talismn/icons"
import { BalanceDto } from "extension-core"
import { FC, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate, useSearchParams } from "react-router-dom"
import { IconButton } from "talisman-ui"

import { SearchInput } from "@talisman/components/SearchInput"
import { useWithdrawWizard } from "@ui/domains/Earn/context/WithdrawWizardContext"
import { mapYieldTokenToTokenId } from "@ui/domains/Earn/utils/tokenMapping"
import { useTokens } from "@ui/state"

export const WithdrawAccountPage: FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState("")
  const { set } = useWithdrawWizard()
  const tokens = useTokens()

  const balancesParam = searchParams.get("balances")

  // Parse balances from URL params
  const balances: BalanceDto[] = useMemo(() => {
    try {
      return balancesParam ? JSON.parse(decodeURIComponent(balancesParam)) : []
    } catch {
      return []
    }
  }, [balancesParam])

  // Get unique accounts from balances
  const accounts = useMemo(() => {
    const accountMap = new Map<string, BalanceDto[]>()

    balances.forEach((balance) => {
      if (!accountMap.has(balance.address)) {
        accountMap.set(balance.address, [])
      }
      accountMap.get(balance.address)!.push(balance)
    })

    return Array.from(accountMap.entries()).map(([address, accountBalances]) => ({
      address,
      balances: accountBalances,
      totalAmount: accountBalances.reduce((sum, b) => sum + parseFloat(b.amount), 0),
    }))
  }, [balances])

  // Filter accounts by search
  const filteredAccounts = useMemo(() => {
    return accounts.filter(
      (account) => !search || account.address.toLowerCase().includes(search.toLowerCase()),
    )
  }, [accounts, search])

  const handleSelect = useCallback(
    (address: string) => {
      set("account", address as string)

      // Navigate to token selection if multiple tokens, otherwise to amount
      const accountBalances = balances.filter((b) => b.address === address)
      const uniqueTokens = new Set(accountBalances.map((b) => b.token.symbol))

      if (uniqueTokens.size > 1) {
        navigate(`/select-product/withdraw/token?${searchParams.toString()}`)
      } else {
        const [onlyBalance] = accountBalances
        if (onlyBalance) {
          const tokenId = mapYieldTokenToTokenId(
            onlyBalance.token.address || onlyBalance.token.symbol,
            onlyBalance.token.network,
            tokens,
          )
          if (tokenId) set("tokenId", tokenId)
        }
        navigate(`/select-product/withdraw/amount?${searchParams.toString()}`)
      }
    },
    [set, navigate, searchParams, balances, tokens],
  )

  const handleBack = useCallback(() => {
    navigate(-1)
  }, [navigate])

  return (
    <div className="flex size-full flex-grow flex-col bg-black">
      <header className="flex w-full items-center justify-between gap-8 overflow-hidden p-10">
        <IconButton onClick={handleBack}>
          <ChevronLeftIcon />
        </IconButton>
        <div className="text-base font-bold">{t("Select account to withdraw from")}</div>
        <div className="w-10" />
      </header>
      <div className="grow overflow-hidden p-12 pt-0">
        <div className="flex min-h-fit w-full items-center gap-8 pb-8">
          <SearchInput onChange={setSearch} placeholder={t("Search by address")} />
        </div>
        <div className="flex flex-col gap-2">
          {filteredAccounts.map((account, idx) => (
            <button
              key={idx}
              type="button"
              className="bg-grey-850 hover:bg-grey-800 flex h-20 w-full items-center gap-4 overflow-hidden rounded-sm px-6"
              onClick={() => handleSelect(account.address)}
            >
              <div className="flex w-full grow flex-col gap-1 overflow-hidden">
                <div className="text-body flex w-full items-center justify-between gap-6 overflow-hidden text-sm font-bold">
                  <div className="grow truncate">{account.address}</div>
                  <div className="max-w-[50%] truncate">
                    {account.totalAmount.toFixed(4)} tokens
                  </div>
                </div>
                <div className="text-body-secondary flex w-full items-center justify-between gap-6 overflow-hidden text-xs font-normal">
                  <div className="grow truncate">{account.balances.length} position(s)</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
