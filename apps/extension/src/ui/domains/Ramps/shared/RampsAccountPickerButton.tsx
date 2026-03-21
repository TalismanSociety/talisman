import type { Account } from "@core/domains/keyring/exports"
import { getAccountGenesisHash, isAccountOwned } from "@core/domains/keyring/exports"
import { isAddressEqual } from "@talismn/crypto"
import { ChevronRightIcon } from "@talismn/icons"
import type { TokenRatesList } from "@talismn/token-rates"
import type { HexString } from "@talismn/util"
import { Drawer } from "@ui/components/Drawer"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { AccountTypeIcon } from "@ui/domains/Account/AccountTypeIcon"
import { Address } from "@ui/domains/Account/Address"
import { type BalancesByParamsProps, useBalancesByParams } from "@ui/hooks/useBalancesByParams"
import { useOpenClose } from "@ui/hooks/useOpenClose"
import { useNetworkById, useToken } from "@ui/state/chaindata"
import { type FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { type RampAccountPickerBalancesDisplayMode, RampsAccountPicker } from "./RampsAccountPicker"

export const RampsAccountPickerButton: FC<{
  accounts: Account[]
  tokenId: string
  tokenRates: TokenRatesList | null | undefined
  balancesDisplayMode: RampAccountPickerBalancesDisplayMode
  selected: string | undefined
  onSelect: (account: string) => void
}> = ({ accounts, tokenId, tokenRates, balancesDisplayMode, selected, onSelect }) => {
  const { isOpen, open, close } = useOpenClose()

  const token = useToken(tokenId)
  const chain = useNetworkById(token?.networkId, "polkadot")

  const account = useMemo(() => {
    if (!selected) return null
    return accounts.find((a) => isAddressEqual(a.address, selected)) ?? null
  }, [accounts, selected])

  const balanceParams = useMemo<BalancesByParamsProps>(() => {
    if (!token || !accounts.length) return {}
    return {
      addressesAndTokens: { tokenIds: [token.id], addresses: accounts.map((a) => a.address) },
    }
  }, [accounts, token])

  // useBalancesByParams fetches balances even if token isnt enabled
  const { balances, status } = useBalancesByParams(balanceParams)

  const handleSelect = useCallback(
    (currency: string) => {
      onSelect(currency)
      close()
    },
    [close, onSelect]
  )

  return (
    <>
      <button
        type="button"
        className="h-[3.25rem] w-full overflow-hidden rounded border border-grey-700 bg-grey-900 text-left enabled:hover:border-grey-500 enabled:hover:bg-grey-850"
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
        <RampsAccountPicker
          token={token}
          accounts={accounts}
          tokenRates={tokenRates}
          balances={balances}
          balancesLoadingStatus={status}
          balancesDisplayMode={balancesDisplayMode}
          selected={selected}
          genesisHash={chain?.genesisHash}
          onSelect={handleSelect}
          onClose={close}
        />
      </Drawer>
    </>
  )
}

const AccountButtonContent: FC<{
  account: Account | null
  /** Used to format addresses */
  genesisHash: HexString | null | undefined
}> = ({ account, genesisHash }) => {
  const { t } = useTranslation()

  if (!account)
    return (
      <div className="flex w-full items-center justify-between px-6 text-body-secondary">
        <div>{t("Select Account")}</div>
        <div>
          <ChevronRightIcon className="size-12" />
        </div>
      </div>
    )

  return (
    <div className="flex size-full items-center gap-4 overflow-hidden px-6">
      <div className="size-16 shrink-0">
        <AccountIcon
          address={account.address}
          genesisHash={getAccountGenesisHash(account)}
          className="size-16 text-xl"
        />
      </div>
      <div className="flex grow flex-col overflow-hidden leading-paragraph">
        <div className="flex w-full items-center gap-2 overflow-hidden text-body">
          <div className="truncate">{account.name}</div>
          <AccountTypeIcon className="shrink-0 text-primary" type={account.type} />
        </div>
        <div className="text-tiny">
          <Address
            address={account.address}
            genesisHash={genesisHash}
            startCharCount={8}
            endCharCount={8}
          />
        </div>
      </div>
      {!isAccountOwned(account) && (
        <div className="shrink-0 rounded-xs border border-alert-warn bg-alert-warn/10 px-3 py-2 text-alert-warn text-xs">
          {t("External")}
        </div>
      )}
    </div>
  )
}
