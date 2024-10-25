import { isEthereumAddress } from "@polkadot/util-crypto"
import { ChevronLeftIcon, XIcon } from "@talismn/icons"
import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { IconButton, Modal } from "talisman-ui"

import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"
import { useAccounts, useChain } from "@ui/state"
import { isEvmToken } from "@ui/util/isEvmToken"

import { NomPoolBondAccountsList } from "./NomPoolBondAccountsList"
import { useNomPoolBondModal } from "./useNomPoolBondModal"
import { useNomPoolBondWizard } from "./useNomPoolBondWizard"

export const NomPoolBondAccountPicker = () => {
  const { t } = useTranslation()
  const { close } = useNomPoolBondModal()
  const { account, token, setAddress, accountPicker } = useNomPoolBondWizard()
  const [search, setSearch] = useState("")

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
    [allAccounts, chain, search, token],
  )

  const handleSelect = useCallback(
    (address: string) => {
      setAddress(address)
      accountPicker.close()
    },
    [accountPicker, setAddress],
  )

  return (
    <Modal
      containerId="StakingModalDialog"
      isOpen={accountPicker.isOpen}
      onDismiss={accountPicker.close}
      className="relative z-50 size-full"
    >
      <div className="flex size-full flex-grow flex-col bg-black">
        <header className="flex items-center justify-between p-10">
          <IconButton onClick={accountPicker.close}>
            <ChevronLeftIcon />
          </IconButton>
          <div>{"Select account"}</div>
          <IconButton onClick={close}>
            <XIcon />
          </IconButton>
        </header>
        <div className="flex grow flex-col">
          <div className="flex min-h-fit w-full items-center gap-8 px-12 pb-8">
            <div className="font-bold">{t("Account")}</div>
            <div className="mx-1 grow overflow-hidden px-1">
              <SearchInput onChange={setSearch} placeholder={t("Search by name")} />
            </div>
          </div>
          <ScrollContainer className="bg-black-secondary border-grey-700 scrollable h-full w-full grow overflow-x-hidden border-t">
            <NomPoolBondAccountsList
              accounts={accounts}
              genesisHash={chain?.genesisHash}
              selected={account?.address}
              onSelect={handleSelect}
              showBalances
              tokenId={token?.id}
              showIfEmpty
            />
          </ScrollContainer>
        </div>
      </div>
    </Modal>
  )
}
