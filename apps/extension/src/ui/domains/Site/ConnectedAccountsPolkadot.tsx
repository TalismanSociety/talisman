import type { Account } from "@core/domains/keyring/exports"
import { isAccountAddressEthereum } from "@core/domains/keyring/exports"
import { InfoIcon } from "@talismn/icons"
import { Checkbox } from "@ui/components/Checkbox"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { type FC, Fragment, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { ConnectAccountToggleButtonRow } from "./ConnectAccountToggleButtonRow"

const AccountSeparator = () => <div className="mx-6 h-0.5 bg-grey-800"></div>

export const ConnectedAccountsPolkadot: FC<{
  activeAccounts: Array<[Account, boolean]>
  onUpdateAccounts: (addresses: string[]) => void
}> = ({ activeAccounts, onUpdateAccounts }) => {
  const { t } = useTranslation()

  const hasEthereumActiveAccounts = useMemo(
    () => activeAccounts.some((acc) => isAccountAddressEthereum(acc[0]) && acc[1]),
    [activeAccounts]
  )
  const [enableEvmAccounts, setEnableEvmAccounts] = useState(hasEthereumActiveAccounts)

  const displayedAccounts = useMemo(
    () => activeAccounts.filter(([acc]) => enableEvmAccounts || !isAccountAddressEthereum(acc)),
    [activeAccounts, enableEvmAccounts]
  )

  const handleAccountToggle = useCallback(
    (address: string) => {
      const isActive = activeAccounts.find(([acc]) => acc.address === address)?.[1] ?? false
      const otherActive = activeAccounts.filter(([, active]) => active).map(([acc]) => acc.address)
      const newActive = isActive
        ? otherActive?.filter((a) => a !== address)
        : [...otherActive, address]
      onUpdateAccounts(newActive)
    },
    [activeAccounts, onUpdateAccounts]
  )

  const handleDisconnectAllClick = useCallback(() => {
    onUpdateAccounts([])
  }, [onUpdateAccounts])

  const handleConnectAllClick = useCallback(() => {
    onUpdateAccounts(displayedAccounts.map(([a]) => a.address))
  }, [displayedAccounts, onUpdateAccounts])

  const handleToggleEvmAccounts = useCallback(() => {
    setEnableEvmAccounts((enabled) => {
      if (enabled) {
        onUpdateAccounts(
          activeAccounts
            .filter(([acc, isConnected]) => !isAccountAddressEthereum(acc) && isConnected)
            .map(([a]) => a.address)
        )
      }
      return !enabled
    })
  }, [activeAccounts, onUpdateAccounts])

  return (
    <>
      <div className="mt-6 mb-2 flex w-full items-center justify-between gap-3 overflow-hidden px-8 text-xs">
        <Checkbox
          checked={enableEvmAccounts}
          onClick={handleToggleEvmAccounts}
          childProps={{ className: "flex items-center gap-2" }}
        >
          <span className="truncate">{t("Ethereum accounts")}</span>
          <Tooltip>
            <TooltipTrigger>
              <InfoIcon />
            </TooltipTrigger>
            <TooltipContent>
              {t(
                "Some Polkadot apps may not work with Ethereum-type accounts. Using an EVM account via Substrate could break certain dApps."
              )}
            </TooltipContent>
          </Tooltip>
        </Checkbox>
        <div className="flex items-center gap-2 truncate">
          <button
            type="button"
            className="truncate text-body-secondary hover:text-grey-300"
            onClick={handleDisconnectAllClick}
          >
            {t("Disconnect All")}
          </button>
          <div className="h-[1rem] w-0.5 bg-body-disabled"></div>
          <button
            type="button"
            className="truncate text-body-secondary hover:text-grey-300"
            onClick={handleConnectAllClick}
          >
            {t("Connect All")}
          </button>
        </div>
      </div>
      {displayedAccounts.map(([acc, isConnected], idx) => (
        <Fragment key={acc.address}>
          {!!idx && <AccountSeparator />}
          <ConnectAccountToggleButtonRow
            account={acc}
            checked={isConnected}
            onClick={() => handleAccountToggle(acc.address)}
          />
        </Fragment>
      ))}
    </>
  )
}
