import { classNames } from "@talismn/util"
import { ScrollContainer } from "@ui/components/ScrollContainer"
import { SearchInputControlled } from "@ui/components/SearchInputControlled"
import {
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
import {
  ValidatorRowSkeleton,
  ValidatorRows,
  ValidatorSortMethodButton,
} from "../../components/ValidatorPicker"
import { useBittensorChangeValidatorWizard } from "../../hooks/useBittensorChangeValidatorWizard"
import { BITTENSOR_TOKEN_ID } from "../../utils/constants"
import { sortValidatorOptions, type ValidatorSortValue } from "../../utils/validatorSorting"

export const ChangeValidatorSelect = () => {
  const { t } = useTranslation()
  const { token, currentHotkey, newHotkey, currentPosition, selectValidator, setStep, close } =
    useBittensorChangeValidatorWizard()

  const netuid = token?.netuid ?? null

  const { combinedValidatorsData, isLoading, isError } = useCombinedBittensorValidatorsData(netuid)

  const [sortMethod, setSortMethod] = useState<ValidatorSortValue>("featured")
  const [rawSearch, setSearch] = useState<string>("")
  const search = useDeferredValue(rawSearch)

  const [sortedValidators, setSortedValidators] = useState<BondOptionType[] | undefined>(() =>
    combinedValidatorsData.length
      ? sortValidatorOptions(combinedValidatorsData, sortMethod)
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
        setSortedValidators(sortValidatorOptions(combinedValidatorsData, sortMethod))
      })
  }, [combinedValidatorsData, sortMethod])

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
          <ValidatorSortMethodButton method={sortMethod} onChange={setSortMethod} />
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
