import { ChevronLeftIcon } from "@talismn/icons"
import { getAccountGenesisHash } from "extension-core"
import { FC, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { IconButton } from "talisman-ui"

import { SearchInput } from "@talisman/components/SearchInput"
import { useAccounts, useBalances } from "@ui/state"

import { useSetEarnWizardAccount } from "../hooks/useEarnWizard"
import { EarnAccountsList } from "./EarnAccountsList"

interface EarnAccountPickerPageProps {
  tokenId: string
  productId?: string
  validatorAddress?: string
}

export const EarnAccountPickerPage: FC<EarnAccountPickerPageProps> = ({
  tokenId,
  productId,
  validatorAddress,
}) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const setEarnWizardAccount = useSetEarnWizardAccount()

  // Get owned accounts only (excludes watch accounts)
  const allAccounts = useAccounts("owned")
  const balances = useBalances()

  // Filter accounts by search and token balance
  const accounts = useMemo(() => {
    return allAccounts
      .filter((account) => !search || account.name?.toLowerCase().includes(search))
      .map((account) => {
        const balance = balances.find({ address: account.address, tokenId }).sorted[0]
        return {
          address: account.address,
          name: account.name,
          genesisHash: getAccountGenesisHash(account),
          balance,
        }
      })
    // Remove the filter - show all accounts, EarnAccountsList will disable those without balance
  }, [allAccounts, search, balances, tokenId])

  const handleSelect = useCallback(
    (address: string) => {
      setEarnWizardAccount(address)

      // If we have a productId, navigate to deposit page
      if (productId) {
        const params = new URLSearchParams({
          account: address,
          tokenId,
          productId,
        })
        // Add validatorAddress if it exists
        if (validatorAddress) {
          params.set("validatorAddress", validatorAddress)
        }
        navigate(`/select-product/deposit/amount?${params.toString()}`)
      } else {
        navigate(-1) // Go back to previous page
      }
    },
    [setEarnWizardAccount, navigate, productId, tokenId, validatorAddress],
  )

  const handleBack = useCallback(() => {
    navigate(-1)
  }, [navigate])

  return (
    <div className="flex size-full flex-grow flex-col bg-black">
      <header className="flex items-center justify-between p-10">
        <IconButton onClick={handleBack}>
          <ChevronLeftIcon />
        </IconButton>
        <div>{t("Select an account to stake")}</div>
        <div className="w-10" /> {/* Spacer for centering */}
      </header>
      <div className="flex grow flex-col overflow-hidden">
        <div className="flex min-h-fit w-full items-center gap-8 px-12 pb-8">
          <SearchInput onChange={setSearch} placeholder={t("Search by name")} />
        </div>
        <EarnAccountsList accounts={accounts} tokenId={tokenId} onSelect={handleSelect} />
      </div>
    </div>
  )
}
