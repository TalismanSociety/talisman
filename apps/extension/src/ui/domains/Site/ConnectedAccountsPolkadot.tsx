import { AccountJsonAny } from "@extension/core"
import { InfoIcon } from "@talismn/icons"
import { FC, Fragment, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Checkbox, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { ConnectAccountToggleButtonRow } from "./ConnectAccountToggleButtonRow"

const AccountSeparator = () => <div className="bg-grey-800 mx-6 h-0.5"></div>

export const ConnectedAccountsPolkadot: FC<{
  activeAccounts: Array<[AccountJsonAny, boolean]>
  onUpdateAccounts: (addresses: string[]) => void
}> = ({ activeAccounts, onUpdateAccounts }) => {
  const { t } = useTranslation()

  const hasEthereumActiveAccounts = useMemo(
    () => activeAccounts.some((acc) => acc[0].type === "ethereum" && acc[1]),
    [activeAccounts]
  )
  const [enableEvmAccounts, setEnableEvmAccounts] = useState(hasEthereumActiveAccounts)

  const displayedAccounts = useMemo(
    () => activeAccounts.filter(([acc]) => enableEvmAccounts || acc.type !== "ethereum"),
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
            .filter(([acc, isConnected]) => acc.type !== "ethereum" && isConnected)
            .map(([a]) => a.address)
        )
      }
      return !enabled
    })
  }, [activeAccounts, onUpdateAccounts])

  return (
    <>
      <div className="mb-2 mt-6 flex w-full items-center justify-between px-8 text-xs">
        <Checkbox
          checked={enableEvmAccounts}
          onClick={handleToggleEvmAccounts}
          childProps={{ className: "flex items-center gap-2" }}
        >
          {t("EVM accounts")}{" "}
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
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="text-body-secondary hover:text-grey-300"
            onClick={handleDisconnectAllClick}
          >
            {t("Disconnect All")}
          </button>
          <div className="bg-body-disabled h-[1rem] w-0.5 "></div>
          <button
            type="button"
            className="text-body-secondary hover:text-grey-300"
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
