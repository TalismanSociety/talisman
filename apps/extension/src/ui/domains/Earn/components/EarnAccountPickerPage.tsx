import { getNetworkGenesisHash } from "@talismn/chaindata-provider"
import { ChevronLeftIcon } from "@talismn/icons"
import { FC, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { IconButton } from "talisman-ui"

import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"
import { useAccounts, useNetworkById, useToken } from "@ui/state"

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

  const token = useToken(tokenId)
  const network = useNetworkById(token?.networkId)

  // Get owned accounts only (excludes watch accounts)
  const allAccounts = useAccounts("owned")

  // Filter accounts by search
  const accounts = useMemo(() => {
    return allAccounts.filter((account) => !search || account.name?.toLowerCase().includes(search))
  }, [allAccounts, search])

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
        <div>{t("Select account")}</div>
        <div className="w-10" /> {/* Spacer for centering */}
      </header>
      <div className="flex h-full min-h-full w-full flex-col overflow-hidden">
        <div className="flex min-h-fit w-full items-center gap-8 px-12 pb-8">
          <div className="mx-1 grow overflow-hidden px-1">
            <SearchInput onChange={setSearch} placeholder={t("Search by account name")} />
          </div>
        </div>
        <ScrollContainer className="bg-black-secondary border-grey-700 scrollable h-full w-full grow overflow-x-hidden border-t">
          <EarnAccountsList
            accounts={accounts}
            genesisHash={getNetworkGenesisHash(network)}
            selected={undefined}
            onSelect={handleSelect}
            showBalances
            tokenId={tokenId}
            showIfEmpty
          />
        </ScrollContainer>
      </div>
    </div>
  )
}
