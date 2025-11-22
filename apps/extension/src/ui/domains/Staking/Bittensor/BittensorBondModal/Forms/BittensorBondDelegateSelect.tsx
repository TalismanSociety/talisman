import { ToolbarSortIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuOptionItem,
  ContextMenuTrigger,
} from "talisman-ui"

import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInputControlled } from "@talisman/components/SearchInputControlled"

import { BondOption as BondOptionType } from "../../../hooks/bittensor/types"
import { useCombinedBittensorValidatorsData } from "../../../hooks/bittensor/useCombinedBittensorValidatorsData"
import { useBittensorBondWizard } from "../../hooks/useBittensorBondWizard"
import { BITTENSOR_TOKEN_ID } from "../../utils/constants"
import { BittensorBondOption, BittensorBondOptionSkeleton } from "../BittensorBondOption"
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

export const BittensorBondDelegateSelect = () => {
  const { hotkey, netuid, setStep, setHotkey } = useBittensorBondWizard()

  const [selectedSortMethod, setSelectedSortMethod] = useState<SortValue>("totalStaked")
  const [search, setSearch] = useState<string>("")

  const { t } = useTranslation()

  const {
    combinedValidatorsData,
    //   isLoading: combinedValidatorsDataLoading,
    isError,
  } = useCombinedBittensorValidatorsData(netuid)

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

  // const isLoading = useMemo(
  //   () => combinedValidatorsDataLoading && !sortedDelegators.length,
  //   [combinedValidatorsDataLoading, sortedDelegators.length],
  // )

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

  // useEffect(() => {
  //   console.log("BittensorBondDelegateSelect displayedValidators", displayedValidators?.length, {
  //     displayedValidators,
  //   })
  // }, [displayedValidators])

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
        {/* <ScrollContainerDraggableHorizontal className="flex justify-between gap-2">
          {sortMethods.map((method) => (
            <button
              key={method.label}
              onClick={() => !isLoading && !method.isDisabled && handleSortMethodChange(method)}
              className={classNames(
                "text-nowrap rounded-[12px] px-[8px] py-[6px] text-sm",
                method.value === selectedSortMethod.value && !search
                  ? "bg-primary-500 text-black"
                  : "bg-black-tertiary text-grey-400",
                (isLoading || method.isDisabled) && "cursor-not-allowed",
              )}
            >
              {t(method.label)}
            </button>
          ))}
        </ScrollContainerDraggableHorizontal> */}
        <div className="flex w-full grow flex-col gap-2 overflow-hidden">
          <div className="text-body-disabled flex justify-between px-12 text-sm">
            <div>{t("Validator")}</div>
            <div>{t("Rank / 30 days APY")}</div>
          </div>
          <ScrollContainer
            className="w-full grow"
            innerClassName="flex flex-col w-full bg-black-secondary"
          >
            {!displayedValidators
              ? Array(10)
                  .fill(null)
                  .map((_, i) => {
                    return <BittensorBondOptionSkeleton key={i} />
                  })
              : displayedValidators.map((option) => (
                  <BittensorBondOption
                    key={option.hotkey}
                    option={option}
                    selectedHotkey={hotkey}
                    handleSelectHotkey={handleSubmit}
                    tokenId={BITTENSOR_TOKEN_ID}
                  />
                ))}
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
