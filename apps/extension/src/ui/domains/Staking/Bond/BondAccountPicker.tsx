import { isEthereumAddress } from "@polkadot/util-crypto"
import { isTokenEth, Token } from "@talismn/chaindata-provider"
import { ChevronLeftIcon, XIcon } from "@talismn/icons"
import { cn } from "@talismn/util"
import { Account, Address, getAccountGenesisHash, isAccountOfType } from "extension-core"
import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { IconButton, Modal } from "talisman-ui"

import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"
import { useAccounts, useNetworkById } from "@ui/state"

import { BondAccountsList } from "./BondAccountsList"

type BondAccountPickerProps = {
  account: Account | null
  token: Token | null
  isOpen: boolean
  onBackClick?: () => void
  onCloseClick?: () => void
  onAddressSelected: (address: Address) => void
  containerId: string
}

export const BondAccountPicker = ({
  account,
  token,
  isOpen,
  containerId,
  onAddressSelected,
  onBackClick,
  onCloseClick,
}: BondAccountPickerProps) => {
  const { t } = useTranslation()
  const [search, setSearch] = useState("")

  const chain = useNetworkById(token?.networkId, "polkadot")

  const allAccounts = useAccounts("owned")

  const accounts = useMemo(
    () =>
      allAccounts
        .filter((account) => !search || account.name?.toLowerCase().includes(search))
        .filter((account) => {
          if (!token) return false

          if (isEthereumAddress(account.address))
            return (
              isTokenEth(token) ||
              (chain?.account === "secp256k1" && !isAccountOfType(account, "ledger-polkadot"))
            )
          else return chain && chain?.account !== "secp256k1"
        })
        .filter((account) => {
          const genesisHash = getAccountGenesisHash(account)
          return !genesisHash || genesisHash === chain?.genesisHash
        }),
    [allAccounts, chain, search, token],
  )

  const handleSelect = useCallback(
    (address: string) => {
      onAddressSelected(address)
      onBackClick?.()
    },
    [onBackClick, onAddressSelected],
  )

  return (
    <Modal
      containerId={containerId}
      isOpen={isOpen}
      onDismiss={onBackClick}
      className="relative z-50 size-full"
    >
      <div className="flex size-full flex-grow flex-col bg-black">
        <header className="flex items-center justify-between p-10">
          <IconButton onClick={onBackClick} className={cn(!onBackClick && "invisible")}>
            <ChevronLeftIcon />
          </IconButton>
          <div>{t("Select account")}</div>
          <IconButton onClick={onCloseClick} className={cn(!onCloseClick && "invisible")}>
            <XIcon />
          </IconButton>
        </header>
        <div className="flex grow flex-col">
          <div className="flex min-h-fit w-full items-center gap-8 px-12 pb-8">
            <div className="mx-1 grow overflow-hidden px-1">
              <SearchInput onChange={setSearch} placeholder={t("Search by name")} />
            </div>
          </div>
          <ScrollContainer className="bg-black-secondary border-grey-700 scrollable h-full w-full grow overflow-x-hidden border-t">
            <BondAccountsList
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
