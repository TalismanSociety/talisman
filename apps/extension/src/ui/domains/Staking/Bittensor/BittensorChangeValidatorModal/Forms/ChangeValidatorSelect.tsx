import { ScrollContainer, useScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInputControlled } from "@talisman/components/SearchInputControlled"
import type { TokenId } from "@talismn/chaindata-provider"
import { GlobeIcon, LockIcon, ToolbarSortIcon, UserIcon } from "@talismn/icons"
import { classNames, cn, planckToTokens } from "@talismn/util"
import { useVirtualizer } from "@tanstack/react-virtual"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { Address } from "@ui/domains/Account/Address"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { useToken } from "@ui/state"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuOptionItem,
  ContextMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ui/talisman-ui"
import {
  type FC,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react"
import { useTranslation } from "react-i18next"

import type { BondOption as BondOptionType } from "../../../hooks/bittensor/types"
import { useCombinedBittensorValidatorsData } from "../../../hooks/bittensor/useCombinedBittensorValidatorsData"
import { BittensorStakingModalHeader } from "../../components/BittensorModalHeader"
import { BittensorModalLayout } from "../../components/BittensorModalLayout"
import { useBittensorChangeValidatorWizard } from "../../hooks/useBittensorChangeValidatorWizard"
import { BITTENSOR_TOKEN_ID } from "../../utils/constants"

type SortValue = "name" | "totalStaked" | "totalStakers" | "apr"

const sortBondOptions = (
  data: BondOptionType[],
  sortBy: SortValue,
  selected: string | null
): BondOptionType[] => {
  return [
    ...[data.find((d) => d.hotkey === selected)].filter((d): d is BondOptionType => !!d), // show selected up top
    ...data
      .filter((d) => d.hotkey !== selected)
      .sort((a, b) => {
        if (sortBy === "name") {
          if (a.name && !b.name) return -1
          if (!a.name && b.name) return 1
          return a.name.localeCompare(b.name)
        } else {
          if (a[sortBy] > b[sortBy]) return -1
          if (a[sortBy] < b[sortBy]) return 1
        }
        return 0
      })
      .sort((a, b) => (a.validatorYield ? -1 : 1) - (b.validatorYield ? -1 : 1)),
  ]
}

export const ChangeValidatorSelect = () => {
  const { t } = useTranslation()
  const { token, currentHotkey, newHotkey, currentPosition, selectValidator, setStep, close } =
    useBittensorChangeValidatorWizard()

  const netuid = token?.netuid ?? null

  const { combinedValidatorsData, isLoading, isError } = useCombinedBittensorValidatorsData(netuid)

  const [sortMethod, setSortMethod] = useState<SortValue>("totalStaked")
  const [rawSearch, setSearch] = useState<string>("")
  const search = useDeferredValue(rawSearch)

  const [sortedValidators, setSortedValidators] = useState<BondOptionType[] | undefined>(() =>
    combinedValidatorsData.length
      ? sortBondOptions(combinedValidatorsData, sortMethod, newHotkey ?? currentHotkey)
      : undefined
  )

  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const displayedValidators = useMemo(() => {
    if (!sortedValidators) return undefined

    const lowerSearch = search.toLowerCase()
    return sortedValidators.filter(
      (delegate) =>
        delegate.name.toLowerCase().includes(lowerSearch) ||
        delegate.hotkey.toLowerCase().includes(lowerSearch)
    )
  }, [sortedValidators, search])

  const handleSubmit = useCallback(
    (hotkey: string) => {
      selectValidator(hotkey)
    },
    [selectValidator]
  )

  const [, startTransition] = useTransition()

  useEffect(() => {
    if (combinedValidatorsData.length)
      startTransition(() => {
        setSortedValidators(
          sortBondOptions(combinedValidatorsData, sortMethod, newHotkey ?? currentHotkey)
        )
      })
  }, [combinedValidatorsData, sortMethod, currentHotkey, newHotkey])

  // biome-ignore lint/correctness/useExhaustiveDependencies: legacy
  useEffect(() => {
    scrollContainerRef.current?.scrollTo(0, 0)
  }, [sortMethod, search])

  // Early return if no token data - must be after all hooks
  if (!token || !currentPosition) {
    return (
      <BittensorModalLayout
        header={
          <BittensorStakingModalHeader
            onCloseModal={close}
            title={t("Select New Validator")}
            onBackClick={() => setStep("form")}
            withClose
          />
        }
      >
        <div className="flex size-full items-center justify-center p-12">
          <div className="text-center text-body-secondary">{t("No staking position found")}</div>
        </div>
      </BittensorModalLayout>
    )
  }

  return (
    <BittensorModalLayout
      header={
        <BittensorStakingModalHeader
          onCloseModal={close}
          title={t("Select New Validator")}
          onBackClick={() => setStep("form")}
          withClose
        />
      }
    >
      <div className="flex size-full flex-col gap-8 overflow-hidden">
        <div className="flex items-center gap-4 px-12">
          <div className="grow">
            <SearchInputControlled
              containerClassName={classNames(
                "!bg-field !px-4 h-[3.6rem] shrink-0 grow rounded-sm border border-field text-sm ring-transparent focus-within:border-grey-700",
                "[&>button>svg]:size-10 [&>input]:text-sm [&>svg]:size-8"
              )}
              placeholder={t("Search validators")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch("")}
              autoFocus
            />
          </div>
          <SortMethodButton method={sortMethod} onChange={(method) => setSortMethod(method)} />
        </div>
        <div className="flex w-full grow flex-col gap-2 overflow-hidden">
          <div className="flex justify-between pr-12 pl-[6rem] text-body-disabled text-sm">
            <div>{t("Validator")}</div>
            <div>{t("APY")}</div>
          </div>
          <ScrollContainer
            ref={scrollContainerRef}
            className="w-full grow"
            innerClassName="flex flex-col w-full bg-black-secondary"
          >
            {!displayedValidators ? (
              Array(10)
                .fill(null)
                .map((_, i) => {
                  // biome-ignore lint/suspicious/noArrayIndexKey: legacy
                  return <ValidatorRowSkeleton key={i} />
                })
            ) : (
              <ValidatorRows
                taoTokenId={BITTENSOR_TOKEN_ID}
                validators={displayedValidators}
                selectedHotkey={newHotkey ?? currentHotkey}
                isLoading={isLoading}
                onSelect={handleSubmit}
              />
            )}
            {isError && (
              <div className="flex h-full items-center justify-center text-alert-error">
                {t("Unable to fetch validators")}
              </div>
            )}
          </ScrollContainer>
        </div>
      </div>
    </BittensorModalLayout>
  )
}

const SortMethodButton: FC<{
  method: SortValue
  onChange: (method: SortValue) => void
}> = ({ method, onChange }) => {
  const { t } = useTranslation()

  const sortMethods = useMemo<{ label: string; value: SortValue }[]>(
    () => [
      { label: t("Total Staked"), value: "totalStaked" },
      { label: t("Name"), value: "name" },
      { label: t("N° of Stakers"), value: "totalStakers" },
      { label: t("APY"), value: "apr" },
    ],
    [t]
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
            label={t(sortMethod.label)}
            selected={sortMethod.value === method}
            onClick={() => onChange(sortMethod.value)}
          />
        ))}
      </ContextMenuContent>
    </ContextMenu>
  )
}

const ValidatorRows: FC<{
  taoTokenId: string
  validators: BondOptionType[]
  selectedHotkey?: string | null
  isLoading?: boolean
  onSelect: (hotkey: string) => void
}> = ({ taoTokenId, validators, selectedHotkey, isLoading, onSelect }) => {
  const { ref: refContainer } = useScrollContainer()
  const ref = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: validators.length,
    estimateSize: () => 58,
    overscan: 5,
    getScrollElement: () => refContainer.current,
  })

  if (!validators.length) return null

  return (
    <div ref={ref}>
      <div
        className="relative w-full"
        style={{
          height: `${virtualizer.getTotalSize()}px`,
        }}
      >
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

const ValidatorRowSkeleton = () => {
  return (
    <div className="flex h-[5.8rem] w-full shrink-0 items-center gap-6 px-12 pl-8 text-left">
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
      className={classNames(
        "flex h-[5.8rem] w-full shrink-0 items-center gap-6 overflow-hidden px-12 pl-8 text-left hover:bg-grey-750 focus:bg-grey-700",
        "disabled:cursor-not-allowed disabled:opacity-50",
        isSelected && "bg-grey-800 text-body-secondary"
      )}
    >
      <AccountIcon address={option.hotkey} className="size-16 shrink-0 text-xl" />
      <div className="flex h-full grow flex-col justify-center gap-2 overflow-hidden">
        <div className="flex w-full justify-between text-body text-sm">
          <div className={cn(option.isRecommended && "font-bold text-primary")}>
            {option.name ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>{option.name}</div>
                </TooltipTrigger>
                <TooltipContent>{option.hotkey}</TooltipContent>
              </Tooltip>
            ) : (
              <Address startCharCount={8} endCharCount={8} address={option.hotkey} />
            )}
          </div>
          <div className={cn(isLoading && "animate-pulse")}>
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
