import { isEthereumAddress } from "@polkadot/util-crypto"
import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"
import { encodeAnyAddress } from "@talismn/util"
import { useSendFundsWizard } from "@ui/apps/popup/pages/SendFunds/context"
import useAccounts from "@ui/hooks/useAccounts"
import useChain from "@ui/hooks/useChain"
import useToken from "@ui/hooks/useToken"
import { isEvmToken } from "@ui/util/isEvmToken"
import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { SendFundsAccountsList } from "./SendFundsAccountsList"

export const SendFundsAccountPicker = () => {
  const { t } = useTranslation("send-funds")
  const { from, to, tokenId, set, remove } = useSendFundsWizard()
  const [search, setSearch] = useState("")

  const token = useToken(tokenId)
  const chain = useChain(token?.chain?.id)

  const allAccounts = useAccounts("owned")

  const accounts = useMemo(
    () =>
      allAccounts
        .filter((account) => !search || account.name?.toLowerCase().includes(search))
        .filter((account) => {
          if (!token) return false

          if (isEthereumAddress(account.address))
            return isEvmToken(token) || (chain?.account === "secp256k1" && !account.isHardware)
          else return chain && chain?.account !== "secp256k1"
        })
        .filter((account) => !account.genesisHash || account.genesisHash === chain?.genesisHash),
    [allAccounts, chain, search, token]
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
      <ScrollContainer className=" bg-black-secondary border-grey-700 scrollable h-full w-full grow overflow-x-hidden border-t">
        <SendFundsAccountsList
          accounts={accounts}
          genesisHash={chain?.genesisHash}
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
