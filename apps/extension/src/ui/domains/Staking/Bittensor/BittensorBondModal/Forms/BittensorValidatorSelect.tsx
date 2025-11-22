import { TokenId } from "@talismn/chaindata-provider"
import { GlobeIcon, LockIcon, ToolbarSortIcon, UserIcon } from "@talismn/icons"
import { classNames, cn, planckToTokens } from "@talismn/util"
import { useVirtualizer } from "@tanstack/react-virtual"
import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuOptionItem,
  ContextMenuTrigger,
} from "talisman-ui"

import { ScrollContainer, useScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInputControlled } from "@talisman/components/SearchInputControlled"
import { Address } from "@ui/domains/Account/Address"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { useToken } from "@ui/state"

import { BondOption as BondOptionType } from "../../../hooks/bittensor/types"
import { useCombinedBittensorValidatorsData } from "../../../hooks/bittensor/useCombinedBittensorValidatorsData"
import { useBittensorBondWizard } from "../../hooks/useBittensorBondWizard"
import { BITTENSOR_TOKEN_ID } from "../../utils/constants"
import { BittensorStakingModalHeader } from "../BittensorModalHeader"
import { BittensorModalLayout } from "../BittensorModalLayout"

type SortValue = "name" | "totalStaked" | "totalStakers" | "apr"

const sortBondOptions = (data: BondOptionType[], sortBy: SortValue): BondOptionType[] =>
  data
    .concat()
    .sort((a, b) => {
      if (sortBy === "name") {
        // Sort by name in ascending order (A to Z)
        if (a.name < b.name) return -1
        if (a.name > b.name) return 1
      } else {
        // Sort other fields in descending order
        if (a[sortBy] > b[sortBy]) return -1
        if (a[sortBy] < b[sortBy]) return 1
      }
      return 0 // Keep them in the same place if equal
    })
    // Validators with yield data first (others dont validate this subnet)
    .sort((a, b) => (a.validatorYield ? -1 : 1) - (b.validatorYield ? -1 : 1))

export const BittensorValidatorSelect = () => {
  const { hotkey, netuid, setStep, setHotkey } = useBittensorBondWizard()

  const [selectedSortMethod, setSelectedSortMethod] = useState<SortValue>("totalStaked")
  const [search, setSearch] = useState<string>("")

  const { t } = useTranslation()

  const { combinedValidatorsData, isLoading, isError } = useCombinedBittensorValidatorsData(netuid)

  const [sortedDelegators, setSortedDelegators] = useState<BondOptionType[] | undefined>(() =>
    combinedValidatorsData.length
      ? sortBondOptions(combinedValidatorsData, selectedSortMethod)
      : undefined,
  )

  const displayedValidators = useMemo(() => {
    if (!sortedDelegators) return undefined

    if (!search) return sortedDelegators

    const lowerSearch = search.toLowerCase()
    return sortedDelegators.filter(
      (delegate) =>
        delegate.name.toLowerCase().includes(lowerSearch) ||
        delegate.hotkey.toLowerCase().includes(lowerSearch),
    )
  }, [sortedDelegators, search])

  useEffect(() => {
    if (combinedValidatorsData.length)
      setSortedDelegators(sortBondOptions(combinedValidatorsData, selectedSortMethod))
  }, [combinedValidatorsData, selectedSortMethod])

  const handleSortMethodChange = (method: SortValue) => {
    setSearch("")
    setSelectedSortMethod(method)
    setSortedDelegators(sortBondOptions(combinedValidatorsData, method))
  }

  const handleSearchClear = useCallback(() => {
    setSearch("")
    // restore selected sort method
    const filteredValidators: BondOptionType[] = sortBondOptions(
      combinedValidatorsData,
      selectedSortMethod,
    )
    setSortedDelegators(filteredValidators)
  }, [combinedValidatorsData, selectedSortMethod])

  const handleSearchChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      const input = e.target.value
      setSearch(input)
      if (!input) {
        handleSearchClear()
      } else {
        const lowerSearch = input.toLowerCase()
        const filtered = combinedValidatorsData.filter(
          (delegate) =>
            delegate.name.toLowerCase().includes(lowerSearch) ||
            delegate.hotkey.toLowerCase().includes(lowerSearch),
        )
        setSortedDelegators(filtered)
      }
    },
    [combinedValidatorsData, handleSearchClear],
  )

  const handleSubmit = useCallback(
    (hotkey: string) => {
      setStep("form")
      setHotkey(hotkey)
    },
    [setHotkey, setStep],
  )

  return (
    <BittensorModalLayout
      header={
        <BittensorStakingModalHeader
          title={t("Select Validator")}
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
                "!bg-field ring-transparent focus-within:border-grey-700 rounded-sm h-[3.6rem] grow border border-field text-sm !px-4 shrink-0",
                "[&>input]:text-sm [&>svg]:size-8 [&>button>svg]:size-10",
              )}
              placeholder={t("Search validators")}
              value={search}
              onChange={handleSearchChange}
              onClear={handleSearchClear}
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
            />
          </div>
          <SortMethodButton method={selectedSortMethod} onChange={handleSortMethodChange} />
        </div>
        <div className="flex w-full grow flex-col gap-2 overflow-hidden">
          <div className="text-body-disabled flex justify-between px-12 text-sm">
            <div>{t("Validator")}</div>
            <div>{t("Rank / 30 days APY")}</div>
          </div>
          <ScrollContainer
            className="w-full grow"
            innerClassName="flex flex-col w-full bg-black-secondary"
          >
            {!displayedValidators ? (
              Array(10)
                .fill(null)
                .map((_, i) => {
                  return <ValidatorRowSkeleton key={i} />
                })
            ) : (
              <ValidatorRows
                taoTokenId={BITTENSOR_TOKEN_ID}
                validators={displayedValidators}
                selectedHotkey={hotkey}
                isLoading={isLoading}
                onSelect={handleSubmit}
              />
            )}
            {isError && (
              <div className="text-alert-error flex h-full items-center justify-center">
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
      { label: t("30 days APY"), value: "apr" },
    ],
    [t],
  )

  const selected = useMemo(
    () => sortMethods.find((sortMethod) => sortMethod.value === method),
    [method, sortMethods],
  )

  return (
    <ContextMenu placement="bottom-end">
      <ContextMenuTrigger asChild>
        <button
          type="button"
          className="bg-field hover:bg-grey-800 text-body-secondary hover:text-grey-300 border-grey-850 flex h-full items-center gap-2 text-nowrap rounded-sm border px-[8px] py-[6px] text-sm"
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
              className="absolute left-0 top-0 w-full"
              style={{
                height: `${item.size}px`,
                transform: `translateY(${item.start}px)`,
              }}
              data-testid="token-picker-row"
            >
              <ValidatorRow
                key={item.key}
                isSelected={validator.hotkey === selectedHotkey}
                option={validator}
                taoTokenId={taoTokenId}
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
      <div className="bg-grey-750 size-16 animate-pulse rounded-full"></div>
      <div className="grow space-y-[5px]">
        <div className={"text-body flex w-full justify-between text-sm font-bold"}>
          <div>
            <div className="bg-grey-750 rounded-xs inline-block h-7 w-56 animate-pulse"></div>
          </div>
          <div>
            <div className="bg-grey-750 rounded-xs inline-block h-7 w-20 animate-pulse"></div>
          </div>
        </div>
        <div className="text-body-secondary flex w-full items-center justify-between gap-2 text-right text-xs font-light">
          <div>
            <div className="bg-grey-800 rounded-xs inline-block h-6 w-40 animate-pulse"></div>
          </div>
          <div className="grow text-right">
            <div className="bg-grey-800 rounded-xs inline-block h-6 w-36 animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

const ValidatorRow: FC<{
  option: BondOptionType
  taoTokenId: TokenId
  isSelected: boolean
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
        "hover:bg-grey-750 focus:bg-grey-700 flex h-[5.8rem] w-full shrink-0 flex-col justify-center gap-3 overflow-hidden px-12 text-left",
        "disabled:cursor-not-allowed disabled:opacity-50",
        isSelected && "bg-grey-800 text-body-secondary",
      )}
    >
      <div className="text-body flex w-full justify-between text-sm">
        <div className={cn(option.isRecommended && "text-primary font-bold")}>
          {option.name || <Address startCharCount={8} endCharCount={8} address={option.hotkey} />}
        </div>
        <div className={cn(isLoading && "animate-pulse")}>#{option.rank}</div>
      </div>
      <div
        className={cn(
          "text-body-secondary flex w-full justify-between text-xs",
          isLoading && "animate-pulse",
        )}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <LockIcon />
            <Tokens
              amount={planckToTokens(option.totalStaked.toString(), tao?.decimals ?? 9)}
              symbol={tao?.symbol}
              noCountUp
            />
          </div>
          <div className="bg-body-disabled inline-block size-2 rounded-full" />
          <div className="flex items-center gap-2">
            <UserIcon />
            {option.totalStakers}
          </div>
          <div className="bg-body-disabled inline-block size-2 rounded-full" />
          <div className="flex items-center gap-2">
            <GlobeIcon />
            {option.subnets}
          </div>
        </div>
        <div>
          {option.validatorYield?.thirty_day_apy
            ? `${(Number(option.validatorYield?.thirty_day_apy) * 100).toFixed(2)}%`
            : t("N/A")}
        </div>
      </div>
    </button>
  )
}
