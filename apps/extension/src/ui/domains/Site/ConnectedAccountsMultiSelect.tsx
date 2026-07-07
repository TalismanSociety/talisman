import type { Account } from "@core/domains/keyring/exports"
import { isAddressEqual } from "@talismn/crypto"
import { type FC, Fragment, useCallback } from "react"
import { useTranslation } from "react-i18next"

import { ConnectAccountToggleButtonRow } from "./ConnectAccountToggleButtonRow"

const AccountSeparator = () => <div className="mx-6 h-0.5 bg-grey-800"></div>

/**
 * Multi-select account list with Connect All / Disconnect All shortcuts.
 * The first connected address is considered the primary account (returned first to dapps).
 * Selection order is preserved: toggling an account on appends it to the list.
 */
export const ConnectedAccountsMultiSelect: FC<{
  accounts: Account[]
  connected: string[]
  onUpdateAccounts: (addresses: string[]) => void
  showAddress?: boolean
}> = ({ accounts, connected, onUpdateAccounts, showAddress }) => {
  const { t } = useTranslation()

  const handleToggle = useCallback(
    (address: string) => {
      const isConnected = connected.some((a) => isAddressEqual(a, address))
      onUpdateAccounts(
        isConnected ? connected.filter((a) => !isAddressEqual(a, address)) : [...connected, address]
      )
    },
    [connected, onUpdateAccounts]
  )

  const handleSetPrimary = useCallback(
    (address: string) => {
      // move the account first, dapps consider the first account as the active one
      onUpdateAccounts([address, ...connected.filter((a) => !isAddressEqual(a, address))])
    },
    [connected, onUpdateAccounts]
  )

  const handleDisconnectAllClick = useCallback(() => {
    onUpdateAccounts([])
  }, [onUpdateAccounts])

  const handleConnectAllClick = useCallback(() => {
    // keep current selection order (primary first), append the others
    onUpdateAccounts([
      ...connected,
      ...accounts
        .map((account) => account.address)
        .filter((address) => !connected.some((a) => isAddressEqual(a, address))),
    ])
  }, [accounts, connected, onUpdateAccounts])

  return (
    <>
      <div className="mt-6 mb-2 flex w-full items-center justify-end gap-2 overflow-hidden px-8 text-xs">
        <button
          type="button"
          className="truncate text-body-secondary hover:text-grey-300"
          onClick={handleDisconnectAllClick}
        >
          {t("Disconnect All")}
        </button>
        <div className="h-5 w-0.5 bg-body-disabled"></div>
        <button
          type="button"
          className="truncate text-body-secondary hover:text-grey-300"
          onClick={handleConnectAllClick}
        >
          {t("Connect All")}
        </button>
      </div>
      {accounts.map((account, idx) => {
        const isConnected = connected.some((a) => isAddressEqual(a, account.address))
        const isPrimary = connected.length > 1 && isAddressEqual(connected[0], account.address)
        return (
          <Fragment key={account.address}>
            {!!idx && <AccountSeparator />}
            <ConnectAccountToggleButtonRow
              account={account}
              showAddress={showAddress}
              checked={isConnected}
              isPrimary={isPrimary}
              onSetPrimaryClick={
                isConnected && !isPrimary && connected.length > 1
                  ? () => handleSetPrimary(account.address)
                  : undefined
              }
              onClick={() => handleToggle(account.address)}
            />
          </Fragment>
        )
      })}
    </>
  )
}
