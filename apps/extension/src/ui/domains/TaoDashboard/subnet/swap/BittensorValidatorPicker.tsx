import { type DotNetworkId, subNativeTokenId } from "@talismn/chaindata-provider"
import { ScrollContainer } from "@ui/components/ScrollContainer"
import { SearchInputControlled } from "@ui/components/SearchInputControlled"
import {
  ValidatorRowSkeleton,
  ValidatorRows,
  ValidatorSortMethodButton,
} from "@ui/domains/Staking/Bittensor/components/ValidatorPicker"
import { ROOT_NETUID } from "@ui/domains/Staking/Bittensor/utils/constants"
import {
  sortValidatorOptions,
  type ValidatorSortValue,
} from "@ui/domains/Staking/Bittensor/utils/validatorSorting"
import type { BondOption as BondOptionType } from "@ui/domains/Staking/hooks/bittensor/types"
import { useCombinedBittensorValidatorsData } from "@ui/domains/Staking/hooks/bittensor/useCombinedBittensorValidatorsData"
import { cn } from "@ui/util/cn"
import {
  type FC,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react"
import { useTranslation } from "react-i18next"

export const BittensorValidatorPicker: FC<{
  networkId: DotNetworkId
  netuid: number
  hotkey: string | null
  containerId?: string
  onSelect: (hotkey: string) => void
}> = ({ networkId, netuid, hotkey, containerId, onSelect }) => {
  const { t } = useTranslation()
  const isRoot = netuid === ROOT_NETUID
  const apyColumnLabel = isRoot ? t("APR [30D]") : t("APY [30D]")
  const { combinedValidatorsData, isLoading, isError } = useCombinedBittensorValidatorsData(
    networkId,
    netuid
  )

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

  const taoTokenId = useMemo(() => subNativeTokenId(networkId), [networkId])

  const [, startTransition] = useTransition()

  // skeletons show until this resolves, so an empty result must still be committed once loaded
  useEffect(() => {
    if (isLoading) return
    startTransition(() => {
      setSortedValidators(sortValidatorOptions(combinedValidatorsData, sortMethod))
    })
  }, [combinedValidatorsData, isLoading, sortMethod])

  // Reset scroll to top when sort method or search changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: legacy
  useEffect(() => {
    scrollContainerRef.current?.scrollTo(0, 0)
  }, [sortMethod, search])

  return (
    <div className="flex size-full flex-col gap-8 overflow-hidden">
      <div className="flex items-center gap-4 px-12">
        <div className="grow">
          <SearchInputControlled
            containerClassName={cn(
              "h-[2.25rem] shrink-0 grow rounded-sm border border-field bg-field! px-4! text-sm ring-transparent focus-within:border-grey-700",
              "[&>button>svg]:size-10 [&>input]:text-sm [&>svg]:size-8"
            )}
            placeholder={t("Search validators")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch("")}
            autoFocus
          />
        </div>
        <ValidatorSortMethodButton
          method={sortMethod}
          onChange={setSortMethod}
          apyLabel={t("Rewards")}
        />
      </div>
      <div className="flex w-full grow flex-col gap-2 overflow-hidden">
        <div className="flex justify-between pr-12 pl-15 text-body-disabled text-sm">
          <div>{t("Validator")}</div>
          <div>{apyColumnLabel}</div>
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
              taoTokenId={taoTokenId}
              validators={displayedValidators}
              selectedHotkey={hotkey}
              isLoading={isLoading}
              showRootWeights={isRoot}
              containerId={containerId}
              onSelect={onSelect}
            />
          )}
          {!isError && displayedValidators?.length === 0 && (
            <div className="flex h-full items-center justify-center text-body-secondary">
              {t("No validators found")}
            </div>
          )}
          {isError && (
            <div className="flex h-full items-center justify-center text-alert-error">
              {t("Unable to fetch validators")}
            </div>
          )}
        </ScrollContainer>
      </div>
    </div>
  )
}
