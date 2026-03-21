import type { Balances } from "@talismn/balances"
import { encodeAnyAddress } from "@talismn/crypto"
import { CheckCircleIcon } from "@talismn/icons"
import { classNames, type HexString } from "@talismn/util"
import { Checkbox } from "@ui/components/Checkbox"
import { Tooltip, TooltipTrigger } from "@ui/components/Tooltip"
import { useBalancesFiatTotal } from "@ui/hooks/useBalancesFiatTotal"
import { type FC, type ReactNode, useCallback, useMemo } from "react"

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
    className="w-20 rounded-sm bg-grey-850 p-4 font-bold text-body-secondary hover:bg-grey-800"
  >
    {children}
  </button>
)

const AccountButtonShimmer: FC<{ withBalances: boolean }> = ({ withBalances }) => (
  <div className={"flex h-32 w-full items-center gap-8 rounded bg-grey-850 px-8"}>
    <div className="inline-block h-16 w-16 animate-pulse rounded-full bg-grey-750"></div>
    <div className="flex grow flex-col gap-2">
      <div className="h-8 w-32.5 animate-pulse rounded-xs bg-grey-750"></div>
      <div className="h-7 w-17 animate-pulse rounded-xs bg-grey-750"></div>
    </div>
    <div
      className={classNames(
        "h-9 w-17 animate-pulse rounded-xs bg-grey-750",
        !withBalances && "invisible"
      )}
    ></div>
    <div className="h-10 w-10 animate-pulse rounded-xs bg-grey-750"></div>
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
  ss58Format,
}) => {
  const totalFiat = useBalancesFiatTotal(balances)

  const [isInitializing, isLoading] = useMemo(
    () => [
      // none are loaded yet
      isBalanceLoading && !balances?.each.some((b) => b.status === "live"),
      // some are loaded, some are still loading
      balances && isBalanceLoading && balances.each.some((b) => b.status === "live"),
    ],
    [balances, isBalanceLoading]
  )

  const formattedAddress = useMemo(() => {
    return encodeAnyAddress(address, { ss58Format })
  }, [address, ss58Format])

  return (
    <button
      type="button"
      className={classNames(
        "flex h-32 w-full items-center gap-8 rounded-sm bg-grey-850 px-8 text-left text-grey-200 enabled:hover:bg-grey-800 disabled:opacity-50"
      )}
      disabled={connected}
      onClick={onClick}
    >
      <AccountIcon address={formattedAddress} genesisHash={genesisHash} className="text-xl" />
      <div className="flex grow flex-col gap-2 overflow-hidden">
        <div className="overflow-hidden text-ellipsis whitespace-nowrap">{name}</div>
        <div className="text-body-secondary text-sm">
          <Address address={formattedAddress} startCharCount={6} endCharCount={6} />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2">
        {withBalances &&
          (isInitializing ? (
            <div className="h-9 w-17 animate-pulse rounded-xs bg-grey-750"></div>
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
          <CheckCircleIcon className="text-lg text-primary" />
        ) : (
          <Checkbox checked={selected} readOnly className="[&>input]:border-body-disabled!" />
        )}
      </div>
    </button>
  )
}

export type DerivedAccountBase = {
  name: string
  accountIndex: number
  address: string
  genesisHash?: HexString
  balances?: Balances
  connected?: boolean
  selected?: boolean
  isBalanceLoading?: boolean
}

type AccountButtonProps = DerivedAccountBase & {
  withBalances: boolean
  ss58Format?: number
  onClick: () => void
}

type DerivedAccountPickerBaseProps = {
  accounts: (DerivedAccountBase | null)[]
  withBalances: boolean
  canPageBack?: boolean
  disablePaging?: boolean
  ss58Format?: number
  onPagerFirstClick?: () => void
  onPagerPrevClick?: () => void
  onPagerNextClick?: () => void
  onAccountClick?: (account: DerivedAccountBase) => void
}

export const DerivedAccountPickerBase: FC<DerivedAccountPickerBaseProps> = ({
  accounts = [],
  disablePaging,
  canPageBack,
  ss58Format,
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
              ss58Format={ss58Format}
              {...account}
              onClick={handleToggleAccount(account)}
            />
          ) : (
            // biome-ignore lint/suspicious/noArrayIndexKey: legacy
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
