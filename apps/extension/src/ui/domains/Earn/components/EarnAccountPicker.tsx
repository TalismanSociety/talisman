import { ChevronLeftIcon, XIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { getAccountGenesisHash } from "extension-core"
import { FC, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { IconButton, Modal } from "talisman-ui"

import { SearchInput } from "@talisman/components/SearchInput"
import { useAccounts, useBalances } from "@ui/state"
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
        <div className="grow overflow-hidden p-12 pt-0">
          <div className="flex min-h-fit w-full items-center gap-8 pb-8">
            <SearchInput onChange={setSearch} placeholder={t("Search by name")} />
          </div>
          <EarnAccountsList accounts={accounts} tokenId={tokenId} onSelect={handleSelect} />
        </div>
      </div>
    </Modal>
  )
}
