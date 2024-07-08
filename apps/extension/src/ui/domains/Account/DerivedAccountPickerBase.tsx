import { Balances } from "@extension/core"
import { AccountJson } from "@polkadot/extension-base/background/types"
import { CheckCircleIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useBalancesFiatTotal } from "@ui/hooks/useBalancesFiatTotal"
import { FC, ReactNode, useCallback, useMemo } from "react"
import { Checkbox, Tooltip, TooltipTrigger } from "talisman-ui"

import { Fiat } from "../Asset/Fiat"
import { AccountIcon } from "./AccountIcon"
import { Address } from "./Address"
import { BalancesSummaryTooltipContent } from "./BalancesSummaryTooltipContent"

const PagerButton: FC<{ disabled?: boolean; children: ReactNode; onClick?: () => void }> = ({
  children,
  disabled,
  onClick,
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className="bg-grey-850 hover:bg-grey-800 text-body-secondary w-20 rounded-sm p-4 font-bold"
  >
    {children}
  </button>
)

const AccountButtonShimmer: FC<{ withBalances: boolean }> = ({ withBalances }) => (
  <div className={"bg-grey-850 flex h-32 w-full items-center gap-8 rounded px-8"}>
    <div className="bg-grey-750 inline-block h-16 w-16 animate-pulse rounded-full"></div>
    <div className="flex grow flex-col gap-2">
      <div className="rounded-xs bg-grey-750 h-[1.6rem] w-[13rem] animate-pulse"></div>
      <div className="rounded-xs bg-grey-750 h-[1.4rem] w-[6.8rem] animate-pulse"></div>
    </div>
    <div
      className={classNames(
        "rounded-xs bg-grey-750 h-[1.8rem] w-[6.8rem] animate-pulse",
        !withBalances && "invisible"
      )}
    ></div>
    <div className="rounded-xs bg-grey-750 h-[2rem] w-[2rem] animate-pulse"></div>
  </div>
)

const AccountButton: FC<AccountButtonProps> = ({
  name,
  address,
  genesisHash,
  balances,
  connected,
  selected,
  onClick,
  withBalances,
  isBalanceLoading,
}) => {
  const totalFiat = useBalancesFiatTotal(balances)

  const [isInitializing, isLoading] = useMemo(
    () => [
      // none are loaded yet
      isBalanceLoading && !balances.each.some((b) => b.status === "live"),
      // some are loaded, some are still loading
      isBalanceLoading && balances.each.some((b) => b.status === "live"),
    ],
    [balances.each, isBalanceLoading]
  )

  return (
    <button
      type="button"
      className={classNames(
        " bg-grey-850 text-grey-200 enabled:hover:bg-grey-800 flex h-32 w-full items-center gap-8 rounded-sm px-8 text-left disabled:opacity-50"
      )}
      disabled={connected}
      onClick={onClick}
    >
      <AccountIcon address={address} genesisHash={genesisHash} className="text-xl" />
      <div className="flex flex-grow flex-col gap-2 overflow-hidden">
        <div className="overflow-hidden text-ellipsis whitespace-nowrap">{name}</div>
        <div className="text-body-secondary text-sm">
          <Address address={address} startCharCount={6} endCharCount={6} />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2">
        {withBalances &&
          (isInitializing ? (
            <div className="rounded-xs bg-grey-750 h-[1.8rem] w-[6.8rem] animate-pulse"></div>
          ) : (
            <Tooltip placement="bottom-end">
              <TooltipTrigger asChild>
                <span className={classNames(isLoading && "animate-pulse")}>
                  <Fiat className="leading-none" amount={totalFiat} isBalance />
                </span>
              </TooltipTrigger>
              <BalancesSummaryTooltipContent balances={balances} />
            </Tooltip>
          ))}
      </div>
      <div className="flex w-12 shrink-0 flex-col items-center justify-center">
        {connected ? (
          <CheckCircleIcon className="text-primary text-lg" />
        ) : (
          <Checkbox checked={selected} readOnly className="[&>input]:!border-body-disabled" />
        )}
      </div>
    </button>
  )
}

export type DerivedAccountBase = AccountJson & {
  name: string
  accountIndex: number
  address: string
  balances: Balances
  connected?: boolean
  selected?: boolean
  isBalanceLoading?: boolean
}

type AccountButtonProps = DerivedAccountBase & {
  withBalances: boolean
  onClick: () => void
}

type DerivedAccountPickerBaseProps = {
  accounts: (DerivedAccountBase | null)[]
  withBalances: boolean
  canPageBack?: boolean
  disablePaging?: boolean
  onPagerFirstClick?: () => void
  onPagerPrevClick?: () => void
  onPagerNextClick?: () => void
  onAccountClick?: (account: DerivedAccountBase) => void
}

export const DerivedAccountPickerBase: FC<DerivedAccountPickerBaseProps> = ({
  accounts = [],
  disablePaging,
  canPageBack,
  onPagerFirstClick,
  onPagerPrevClick,
  onPagerNextClick,
  onAccountClick,
  withBalances = true,
}) => {
  const handleToggleAccount = useCallback(
    (acc: DerivedAccountBase) => () => {
      onAccountClick?.(acc)
    },
    [onAccountClick]
  )

  // keep pulsing animations in sync
  const keyPrefix = useMemo(
    () =>
      accounts
        .filter((a) => a?.isBalanceLoading)
        .map((a) => a?.address)
        .join("-"),
    [accounts]
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex w-full flex-col gap-4">
        {accounts.map((account, i) =>
          account ? (
            <AccountButton
              key={`${keyPrefix}::${account.address}`}
              withBalances={withBalances}
              isBalanceLoading={account.isBalanceLoading}
              {...account}
              onClick={handleToggleAccount(account)}
            />
          ) : (
            <AccountButtonShimmer key={i} withBalances={withBalances} />
          )
        )}
      </div>
      <div className="flex w-full justify-end gap-6">
        {canPageBack && (
          <PagerButton disabled={disablePaging} onClick={onPagerFirstClick}>
            &lt;&lt;
          </PagerButton>
        )}
        {canPageBack && (
          <PagerButton disabled={disablePaging} onClick={onPagerPrevClick}>
            &lt;
          </PagerButton>
        )}
        <PagerButton disabled={disablePaging} onClick={onPagerNextClick}>
          &gt;
        </PagerButton>
      </div>
    </div>
  )
}
