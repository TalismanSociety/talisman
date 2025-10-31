import { ChevronLeftIcon } from "@talismn/icons"
import { formatDecimals } from "@talismn/util"
import { BalanceDto } from "extension-core"
import { FC, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate, useSearchParams } from "react-router-dom"
import { IconButton } from "talisman-ui"

import { SearchInput } from "@talisman/components/SearchInput"
import { AssetLogo } from "@ui/domains/Asset/AssetLogo"
import { FiatFromUsd } from "@ui/domains/Asset/Fiat"
import { useWithdrawWizard } from "@ui/domains/Earn/context/WithdrawWizardContext"
import { mapYieldTokenToTokenId } from "@ui/domains/Earn/utils/tokenMapping"
import { useTokens } from "@ui/state"

export const WithdrawTokenPage: FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState("")
  const { set, setBalance } = useWithdrawWizard()
  const tokens = useTokens()

  const account = searchParams.get("account")
  const balancesParam = searchParams.get("balances")

  // Parse balances from URL params and filter by selected account
  const balances: BalanceDto[] = useMemo(() => {
    try {
      const allBalances = balancesParam ? JSON.parse(decodeURIComponent(balancesParam)) : []
      return allBalances.filter((b: BalanceDto) => b.address === account)
    } catch {
      return []
    }
  }, [balancesParam, account])

  // Filter balances by search
  const filteredBalances = useMemo(() => {
    return balances.filter(
      (balance) => !search || balance.token.symbol.toLowerCase().includes(search.toLowerCase()),
    )
  }, [balances, search])

  const handleSelect = useCallback(
    (balance: BalanceDto) => {
      // Map the token to the correct tokenId using token mapping
      const tokenId = mapYieldTokenToTokenId(
        balance.token.address || balance.token.symbol,
        balance.token.network,
        tokens,
      )
      if (tokenId) {
        set("tokenId", tokenId)
      }
      setBalance(balance)
      navigate(`/select-product/withdraw/amount?${searchParams.toString()}`)
    },
    [set, setBalance, navigate, searchParams, tokens],
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
        <div className="text-base font-bold">{t("Select token to withdraw")}</div>
        <div className="w-10" />
      </header>
      <div className="grow overflow-hidden p-12 pt-0">
        <div className="flex min-h-fit w-full items-center gap-8 pb-8">
          <SearchInput onChange={setSearch} placeholder={t("Search by token")} />
        </div>
        <div className="flex flex-col gap-2">
          {filteredBalances.map((balance, idx) => (
            <button
              key={idx}
              type="button"
              className="bg-grey-850 hover:bg-grey-800 flex h-20 w-full items-center gap-4 overflow-hidden rounded-sm px-6"
              onClick={() => handleSelect(balance)}
            >
              <AssetLogo url={balance.token.logoURI} className="size-12" />
              <div className="flex w-full grow flex-col gap-1 overflow-hidden">
                <div className="text-body flex w-full items-center justify-between gap-6 overflow-hidden text-sm font-bold">
                  <div className="grow truncate">{balance.token.symbol}</div>
                  <div className="max-w-[50%] truncate">
                    {formatDecimals(balance.amount)} {balance.token.symbol}
                  </div>
                </div>
                <div className="text-body-secondary flex w-full items-center justify-between gap-6 overflow-hidden text-xs font-normal">
                  <div className="grow truncate">{balance.token.name}</div>
                  <div className="shrink-0">
                    <FiatFromUsd amount={parseFloat(balance.amountUsd || "0")} isBalance />
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
