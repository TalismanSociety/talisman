import { isEthereumAddress } from "@polkadot/util-crypto"
import { useCallback, useState } from "react"
import { useTranslation } from "react-i18next"

import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"
import { AccountRow } from "@ui/domains/SendFunds/AccountRow"

import { AccountWithBalance } from "../../../types"
import { useBuyTokensWizard } from "../../../useBuyTokensWizard"
import { BuyTokensLayout } from "../../BuyTokensLayout"

export const BuyTokensAccountPicker = () => {
  const [filteredAccounts, setFilteredAccounts] = useState<AccountWithBalance[]>([])
  const {
    supportedAccountsWithBalance,
    buySellForm: { watch, setValue },
    setRoute,
  } = useBuyTokensWizard()

  const [address, { isEvm }] = watch(["address", "rampTokenAsset"])

  const { t } = useTranslation()

  const handleAccountChange = useCallback(
    (selectedAddress: string) => {
      if (!selectedAddress) return

      setValue("address", selectedAddress, { shouldValidate: true })

      if (isEvm !== isEthereumAddress(selectedAddress)) {
        setValue(
          "rampTokenAsset",
          {
            id: "",
            symbol: "",
            chain: "",
            decimals: 0,
            isEvm: false,
            chainId: "",
            chainPrefix: null,
            minPurchaseAmount: 0,
          },
          { shouldValidate: true },
        )
      }

      setRoute("mainForm")
    },

    [isEvm, setRoute, setValue],
  )

  const handleSearch = useCallback(
    (value: string) => {
      const filteredAccounts = supportedAccountsWithBalance.filter(
        (account) => !value || account.name?.toLowerCase().includes(value),
      )
      setFilteredAccounts(filteredAccounts)
    },
    [supportedAccountsWithBalance],
  )

  return (
    <BuyTokensLayout title={t("Select account")} withBackLink>
      <div className="flex h-full min-h-full w-full flex-col overflow-hidden">
        <div className="flex min-h-fit w-full items-center gap-8 px-12 pb-8">
          <SearchInput onChange={handleSearch} placeholder={t("Search by account name")} />
        </div>
        <ScrollContainer className="bg-black-secondary border-grey-700 scrollable h-full w-full grow overflow-x-hidden border-t">
          {filteredAccounts.map((account) => (
            <AccountRow
              account={account}
              key={account.address}
              selected={account.address === address}
              showTotalBalance
              onClick={() => handleAccountChange(account.address)}
            />
          ))}
          {!filteredAccounts?.length && (
            <div className="text-body-secondary flex h-[5.8rem] w-full items-center px-12 text-left">
              {t("No account matches your search")}
            </div>
          )}
        </ScrollContainer>
      </div>
    </BuyTokensLayout>
  )
}
