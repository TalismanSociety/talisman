import { isAddressEqual } from "@talismn/crypto"
import {
  Account,
  getAccountGenesisHash,
  isAccountCompatibleWithChain,
  isAccountEthereum,
} from "extension-core"
import { HexString } from "extension-shared"
import { FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Drawer, useOpenClose } from "talisman-ui"

import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { Address } from "@ui/domains/Account/Address"
import { useAccounts, useChain, useToken } from "@ui/state"
import { isEvmToken } from "@ui/util/isEvmToken"
import { isSubToken } from "@ui/util/isSubToken"

import { RampAccountPicker } from "./RampAccountPicker"

export const RampAccountPickerButton: FC<{
  tokenId: string
  selected: string | undefined
  onSelect: (account: string) => void
}> = ({ tokenId, selected, onSelect }) => {
  // const { t } = useTranslation()
  const { isOpen, open, close } = useOpenClose()

  const token = useToken(tokenId)
  const chain = useChain(token?.chain?.id)

  const allAccounts = useAccounts()

  const accounts = useMemo(
    () =>
      allAccounts.filter((account) => {
        if (isEvmToken(token)) return isAccountEthereum(account)
        if (isSubToken(token) && chain) return isAccountCompatibleWithChain(chain, account)
        return false
      }),
    [allAccounts, chain, token],
  )

  const account = useMemo(() => {
    if (!selected) return null
    return accounts.find((a) => isAddressEqual(a.address, selected)) ?? null
  }, [accounts, selected])

  const handleSelect = useCallback(
    (currency: string) => {
      onSelect(currency)
      close()
    },
    [close, onSelect],
  )

  return (
    <div>
      <button
        type="button"
        className="border-grey-700 bg-grey-900 enabled:hover:bg-grey-850 enabled:hover:border-grey-500 h-[5.2rem] w-full overflow-hidden rounded border text-left"
        onClick={open}
      >
        <AccountButtonContent account={account} genesisHash={chain?.genesisHash} />
      </button>
      <Drawer
        containerId="ramp-container"
        isOpen={isOpen}
        anchor="right"
        className="size-full bg-black"
      >
        <RampAccountPicker
          accounts={accounts}
          selected={selected}
          genesisHash={chain?.genesisHash}
          onSelect={handleSelect}
          onClose={close}
        />
      </Drawer>
    </div>
  )
}

const AccountButtonContent: FC<{
  account: Account | null
  /** Used to format addresses */
  genesisHash: HexString | null | undefined
}> = ({ account, genesisHash }) => {
  const { t } = useTranslation()

  if (!account)
    return <div className="text-body-secondary w-full px-4 text-center">{t("Select Account")}</div>

  return (
    <div className="flex size-full items-center gap-4 px-4">
      <div className="size-16 shrink-0">
        <AccountIcon
          address={account.address}
          genesisHash={getAccountGenesisHash(account)}
          className="size-16 text-xl"
        />
      </div>
      <div className="leading-paragraph grow">
        <div className="text-body font-bold">{account.name}</div>
        <div>
          <Address
            address={account.address}
            genesisHash={genesisHash}
            startCharCount={8}
            endCharCount={6}
          />
        </div>
      </div>
    </div>
  )
}
