import { isAccountCompatibleWithNetwork } from "@core"
import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"
import { getNetworkGenesisHash } from "@talismn/chaindata-provider"
import { encodeAnyAddress } from "@talismn/crypto"
import { useSendFundsWizard } from "@ui/apps/popup/pages/SendFunds/context"
import { useAccounts, useNetworkById, useToken } from "@ui/state"
import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { SendFundsAccountsList } from "./SendFundsAccountsList"

export const SendFundsAccountPicker = () => {
  const { t } = useTranslation()
  const { from, to, tokenId, set, remove } = useSendFundsWizard()
  const [search, setSearch] = useState("")

  const token = useToken(tokenId)
  const network = useNetworkById(token?.networkId)

  const allAccounts = useAccounts("owned")

  const accounts = useMemo(
    () =>
      allAccounts
        .filter((account) => !search || account.name?.toLowerCase().includes(search))
        .filter((account) => network && isAccountCompatibleWithNetwork(network, account)),
    [allAccounts, network, search]
  )

  const handleSelect = useCallback(
    (address: string) => {
      if (to && encodeAnyAddress(to) === encodeAnyAddress(address)) remove("to")
      set("from", address, true)
    },
    [remove, set, to]
  )

  return (
    <div className="flex h-full min-h-full w-full flex-col overflow-hidden">
      <div className="flex min-h-fit w-full items-center gap-8 px-12 pb-8">
        <div className="font-bold">{"From"}</div>
        <div className="mx-1 grow overflow-hidden px-1">
          <SearchInput onChange={setSearch} placeholder={t("Search by account name")} />
        </div>
      </div>
      <ScrollContainer className="scrollable h-full w-full grow overflow-x-hidden border-grey-700 border-t bg-black-secondary">
        <SendFundsAccountsList
          accounts={accounts}
          genesisHash={getNetworkGenesisHash(network)}
          selected={from}
          onSelect={handleSelect}
          showBalances
          tokenId={tokenId}
          showIfEmpty
        />
      </ScrollContainer>
    </div>
  )
}
