import type { TokenId } from "@talismn/chaindata-provider"
import { GlobeIcon, LockIcon, TalismanHandIcon, ToolbarSortIcon, UserIcon } from "@talismn/icons"
import { cn, planckToTokens } from "@talismn/util"
import { useVirtualizer } from "@tanstack/react-virtual"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuOptionItem,
  ContextMenuTrigger,
} from "@ui/components/ContextMenu"
import { useScrollContainer } from "@ui/components/ScrollContainer"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { Address } from "@ui/domains/Account/Address"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { EarnTypeBadge } from "@ui/domains/Earn/components/EarnTypeBadge"
import { useToken } from "@ui/state/chaindata"
import { type FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

import type { BondOption as BondOptionType } from "../../hooks/bittensor/types"
import type { ValidatorSortValue } from "../utils/validatorSorting"

export const ValidatorSortMethodButton: FC<{
  method: ValidatorSortValue
  onChange: (method: ValidatorSortValue) => void
  apyLabel?: string
}> = ({ method, onChange, apyLabel }) => {
  const { t } = useTranslation()

  const sortMethods = useMemo<{ label: string; value: ValidatorSortValue }[]>(
    () => [
      { label: t("Featured"), value: "featured" },
      { label: t("Total Staked"), value: "totalStaked" },
      { label: t("Name"), value: "name" },
      { label: t("N° of Stakers"), value: "totalStakers" },
      { label: apyLabel ?? t("APY"), value: "apr" },
    ],
    [apyLabel, t]
  )

  const selected = useMemo(
    () => sortMethods.find((sortMethod) => sortMethod.value === method),
    [method, sortMethods]
  )

  return (
    <ContextMenu placement="bottom-end">
      <ContextMenuTrigger asChild>
        <button
          type="button"
          className="flex h-full items-center gap-4 text-nowrap rounded-sm border border-grey-850 bg-field px-[8px] py-[6px] text-body-secondary text-sm hover:bg-grey-800 hover:text-grey-300"
        >
          <div>{selected?.label}</div>
          <ToolbarSortIcon className="size-10" />
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {sortMethods.map((sortMethod) => (
          <ContextMenuOptionItem
            key={sortMethod.value}
            label={sortMethod.label}
            selected={sortMethod.value === method}
            onClick={() => onChange(sortMethod.value)}
          />
        ))}
      </ContextMenuContent>
    </ContextMenu>
  )
}

export const ValidatorRows: FC<{
  taoTokenId: string
  validators: BondOptionType[]
  selectedHotkey?: string | null
  isLoading?: boolean
  onSelect: (hotkey: string) => void
}> = ({ taoTokenId, validators, selectedHotkey, isLoading, onSelect }) => {
  const { ref: refContainer } = useScrollContainer()

  const featuredBoundary = useMemo(() => {
    const idx = validators.findIndex((v) => !v.isFeatured)
    // only show divider if there are both featured and non-featured validators
    if (idx <= 0) return null
    return idx
  }, [validators])

  const virtualizer = useVirtualizer({
    count: validators.length,
    estimateSize: () => 58,
    overscan: 5,
    getScrollElement: () => refContainer.current,
  })

  if (!validators.length) return null

  return (
    <div>
      <div
        className="relative w-full"
        style={{
          height: `${virtualizer.getTotalSize()}px`,
        }}
      >
        {featuredBoundary !== null && (
          <div
            className="absolute right-12 left-8 h-[2px] rounded-full bg-white/10"
            style={{ top: `${featuredBoundary * 58}px` }}
          />
        )}
        {virtualizer.getVirtualItems().map((item) => {
          const validator = validators[item.index]
          if (!validator) return null

          return (
            <div
              key={item.key}
              className="absolute top-0 left-0 w-full"
              style={{
                height: `${item.size}px`,
                transform: `translateY(${item.start}px)`,
              }}
              data-testid="token-picker-row"
            >
              <ValidatorRow
                key={item.key}
                option={validator}
                taoTokenId={taoTokenId}
                isSelected={validator.hotkey === selectedHotkey}
                onClick={() => onSelect(validator.hotkey)}
                isLoading={isLoading}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export const ValidatorRowSkeleton = () => {
  return (
    <div className="flex h-14.5 w-full shrink-0 items-center gap-6 px-12 pl-8 text-left">
      <div className="size-16 animate-pulse rounded-full bg-grey-750"></div>
      <div className="grow space-y-[5px]">
        <div className={"flex w-full justify-between font-bold text-body text-sm"}>
          <div>
            <div className="inline-block h-7 w-56 animate-pulse rounded-xs bg-grey-750"></div>
          </div>
          <div>
            <div className="inline-block h-7 w-20 animate-pulse rounded-xs bg-grey-750"></div>
          </div>
        </div>
        <div className="flex w-full items-center justify-between gap-2 text-right font-light text-body-secondary text-xs">
          <div>
            <div className="inline-block h-6 w-40 animate-pulse rounded-xs bg-grey-800"></div>
          </div>
          <div className="grow text-right">
            <div className="inline-block h-6 w-36 animate-pulse rounded-xs bg-grey-800"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

const ValidatorRow: FC<{
  option: BondOptionType
  taoTokenId: TokenId
  isSelected?: boolean
  isLoading?: boolean
  onClick: () => void
}> = ({ option, isSelected, isLoading, taoTokenId, onClick }) => {
  const { t } = useTranslation()
  const tao = useToken(taoTokenId)

  return (
    <button
      type="button"
      key={option.hotkey}
      onClick={onClick}
      className={cn(
        "flex h-14.5 w-full shrink-0 items-center gap-6 overflow-hidden px-12 pl-8 text-left hover:bg-grey-750 focus:bg-grey-700",
        "disabled:cursor-not-allowed disabled:opacity-50",
        isSelected && "bg-grey-800 text-body-secondary"
      )}
    >
      <AccountIcon address={option.hotkey} className="size-16 shrink-0 text-xl" />
      <div className="flex h-full grow flex-col justify-center gap-2 overflow-hidden">
        <div className="flex w-full justify-between gap-8 text-body text-sm">
          <div className={cn("min-w-0", option.isRecommended && "font-bold text-primary")}>
            <div className="flex items-center gap-2">
              {option.name ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="truncate">{option.name}</div>
                  </TooltipTrigger>
                  <TooltipContent>{option.hotkey}</TooltipContent>
                </Tooltip>
              ) : (
                <Address startCharCount={8} endCharCount={8} address={option.hotkey} />
              )}
              {option.isFeatured && (
                <EarnTypeBadge className="mx-0 inline-flex h-[18px] shrink-0 items-center gap-[4px] rounded-[12px] border-none bg-primary/10 px-[8px] font-light text-[10px] text-primary normal-case">
                  <TalismanHandIcon className="size-[12px]" />
                  {t("Featured")}
                </EarnTypeBadge>
              )}
            </div>
          </div>
          <div className={cn("shrink-0", isLoading && "animate-pulse")}>
            {option.validatorYield?.thirty_day_apy
              ? `${(Number(option.validatorYield?.thirty_day_apy) * 100).toFixed(2)}%`
              : t("N/A")}
          </div>
        </div>
        <div
          className={cn(
            "flex w-full justify-between text-body-secondary text-xs",
            isLoading && "animate-pulse"
          )}
        >
          <div className="flex items-center gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  <LockIcon />
                  <Tokens
                    amount={planckToTokens(option.totalStaked.toString(), tao?.decimals ?? 9)}
                    symbol={tao?.symbol}
                    noCountUp
                    noTooltip
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="flex flex-col gap-2">
                  <div>{t("Total staked in this validator:")}</div>
                  <div>
                    {planckToTokens(option.totalStaked.toString(), tao?.decimals ?? 9)}{" "}
                    {tao?.symbol}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
            <div className="inline-block size-2 rounded-full bg-body-disabled" />
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  <UserIcon />
                  {option.totalStakers}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {t("{{count}} nominators", { count: option.totalStakers })}
              </TooltipContent>
            </Tooltip>
            <div className="inline-block size-2 rounded-full bg-body-disabled" />
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  <GlobeIcon />
                  {option.subnets}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {t("Validating {{count}} subnets", { count: option.subnets })}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </button>
  )
}
