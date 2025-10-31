import { getNetworkGenesisHash } from "@talismn/chaindata-provider"
import { ChevronLeftIcon, XIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { IconButton, Modal } from "talisman-ui"

import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"
import { useAccounts, useNetworkById, useToken } from "@ui/state"
import { IS_POPUP } from "@ui/util/constants"

import { EarnAccountsList } from "./EarnAccountsList"

interface EarnAccountPickerProps {
  isOpen: boolean
  tokenId: string
  onDismiss: () => void
  onSelect: (address: string) => void
}

export const EarnAccountPicker: FC<EarnAccountPickerProps> = ({
  isOpen,
  tokenId,
  onDismiss,
  onSelect,
}) => {
  const { t } = useTranslation()
  const [search, setSearch] = useState("")

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
      onSelect(address)
      onDismiss()
    },
    [onSelect, onDismiss],
  )

  // Only render modal in dashboard mode (not popup)
  if (IS_POPUP) {
    return null
  }

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={onDismiss}>
      <div
        className={classNames(
          "relative flex h-[60rem] max-h-[100dvh] w-[40rem] max-w-[100dvw] flex-col overflow-hidden bg-black",
          "border-grey-800 rounded border",
        )}
      >
        <header className="flex w-full items-center justify-between gap-8 overflow-hidden p-10">
          <IconButton onClick={onDismiss}>
            <ChevronLeftIcon />
          </IconButton>
          <div className="text-base font-bold">{t("Select an account to stake")}</div>
          <IconButton onClick={onDismiss} className="invisible">
            <XIcon />
          </IconButton>
        </header>
        <div className="grow overflow-hidden pb-12 pt-0">
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
      </div>
    </Modal>
  )
}
