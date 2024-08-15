import { isEthereumAddress } from "@polkadot/util-crypto"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Modal } from "talisman-ui"

import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"
import useAccounts from "@ui/hooks/useAccounts"
import useChain from "@ui/hooks/useChain"
import { isEvmToken } from "@ui/util/isEvmToken"

import { InlineStakingAccountsList } from "./InlineStakingAccountsList"
import { useInlineStakingForm } from "./useInlineStaking"

export const InlineStakingAccountPicker = () => {
  const { t } = useTranslation()
  //const { from, to, tokenId, set, remove } = useSendFundsWizard()
  const { account, token, setAddress, accountPicker } = useInlineStakingForm()
  const [search, setSearch] = useState("")

  // const token = useToken(tokenId)
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

  //   const handleSelect = useCallback(
  //     (address: string) => {
  //       if (to && encodeAnyAddress(to) === encodeAnyAddress(address)) remove("to")
  //       set("from", address, true)
  //     },
  //     [remove, set, to]
  //   )

  return (
    <Modal
      containerId="inlineStakingModalDialog"
      isOpen={accountPicker.isOpen}
      onDismiss={accountPicker.close}
      className="size-full"
    >
      <div className="flex h-full min-h-full w-full flex-col overflow-hidden">
        <div className="flex min-h-fit w-full items-center gap-8 px-12 pb-8">
          <div className="font-bold">{"From"}</div>
          <div className="mx-1 grow overflow-hidden px-1">
            <SearchInput onChange={setSearch} placeholder={t("Search by account name")} />
          </div>
        </div>
        <ScrollContainer className=" bg-black-secondary border-grey-700 scrollable h-full w-full grow overflow-x-hidden border-t">
          <InlineStakingAccountsList
            accounts={accounts}
            genesisHash={chain?.genesisHash}
            selected={account?.address}
            onSelect={setAddress}
            showBalances
            tokenId={token?.id}
            showIfEmpty
          />
        </ScrollContainer>
      </div>
    </Modal>
  )
}
