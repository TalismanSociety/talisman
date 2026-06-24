import { ALPHA_PRICE_SCALE } from "@talismn/balances"
import { subDTaoTokenId } from "@talismn/chaindata-provider"
import { ToolbarSortIcon } from "@talismn/icons"
import { useVirtualizer } from "@tanstack/react-virtual"
import { Button } from "@ui/components/Button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuOptionItem,
  ContextMenuTrigger,
} from "@ui/components/ContextMenu"
import { ScrollContainer, useScrollContainer } from "@ui/components/ScrollContainer"
import { SearchInputControlled } from "@ui/components/SearchInputControlled"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import type { SubnetData } from "@ui/domains/Staking/hooks/bittensor/dTao/types"
import { useCombinedSubnetData } from "@ui/domains/Staking/hooks/bittensor/dTao/useCombinedSubnetData"
import { StakingFeeEstimate } from "@ui/domains/Staking/shared/StakingFeeEstimate"
import { SapiSendButton } from "@ui/domains/Transactions/SapiSendButton"
import { useToken } from "@ui/state/chaindata"
import { cn } from "@ui/util/cn"
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

import { BittensorStakingModalHeader } from "../../components/BittensorModalHeader"
import { BittensorModalLayout } from "../../components/BittensorModalLayout"
import { BITTENSOR_NETWORK_ID, BITTENSOR_SETTINGS_MODAL_CONTENT_CONTAINER_ID } from "../constants"
import { useBittensorSettingsModal } from "../hooks/useBittensorSettingsModal"
import { useBittensorSettingsWizard } from "../hooks/useBittensorSettingsWizard"

type SortValue = "netuid" | "emission"

const sortSubnetOptions = (data: SubnetData[], sortBy: SortValue): SubnetData[] => {
  const descendingFilters: SortValue[] = ["emission"]
  const sorted = data
    .filter((sn) => sn.netuid)
    .sort((a, b) => {
      if (descendingFilters.includes(sortBy)) {
        if (Number(a[sortBy] || 0) > Number(b[sortBy] || 0)) return -1
        if (Number(a[sortBy] || 0) < Number(b[sortBy] || 0)) return 1
        return 0
      } else {
        if (Number(a[sortBy] || 0) < Number(b[sortBy] || 0)) return -1
        if (Number(a[sortBy] || 0) > Number(b[sortBy] || 0)) return 1
        return 0
      }
    })

  return sorted
}

export const BittensorClaimSubnetSelect = () => {
  const { t } = useTranslation()
  const {
    setStep,
    nativeToken,
    selectedSubnets,
    setSelectedSubnets,
    canSubmit,
    payload,
    txMetadata,
    isLoadingPayload,
    feeEstimate,
    isLoadingFeeEstimate,
    errorFeeEstimate,
    onSubmitted,
  } = useBittensorSettingsWizard()
  const { close } = useBittensorSettingsModal()
  const [sortMethod, setSortMethod] = useState<SortValue>("netuid")
  const [search, setSearch] = useState<string>("")
  const deferredSearch = useDeferredValue(search)

  const [preselectedSubnets, setPreselectedSubnets] = useState(() => selectedSubnets)

  const { subnetData, isLoading, isSubnetsLoading } = useCombinedSubnetData(BITTENSOR_NETWORK_ID)

  const [sortedSubnets, setSortedSubnets] = useState<SubnetData[]>(() =>
    sortSubnetOptions(subnetData, sortMethod)
  )

  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const displayedSubnets = useMemo(() => {
    const lowerSearch = deferredSearch.toLowerCase()
    const filtered = sortedSubnets.filter((subnet) => {
      const { netuid, name, symbol } = subnet
      const subnetName = `${netuid} ${name} ${symbol}`.toLowerCase()
      return subnetName.includes(lowerSearch)
    })

    // Put confirmed subnets at the top, maintaining their relative order
    const confirmed = filtered.filter(
      (s) => s.netuid !== undefined && preselectedSubnets.includes(s.netuid)
    )
    const others = filtered.filter(
      (s) => s.netuid === undefined || !preselectedSubnets.includes(s.netuid)
    )

    return [...confirmed, ...others]
  }, [deferredSearch, preselectedSubnets, sortedSubnets])

  const handleToggleSubnet = useCallback(
    (netuid: number) => {
      setSelectedSubnets(
        selectedSubnets.includes(netuid)
          ? selectedSubnets.filter((id) => id !== netuid)
          : [...selectedSubnets, netuid]
      )
    },
    [selectedSubnets, setSelectedSubnets]
  )

  const handleSortMethodChange = useCallback(
    (method: SortValue) => {
      // if sort method changed, we want to update preselected subnets to match current selection
      setPreselectedSubnets(selectedSubnets)
      setSortMethod(method)
    },
    [selectedSubnets]
  )

  const [, startTransition] = useTransition()

  useEffect(() => {
    startTransition(() => {
      setSortedSubnets(sortSubnetOptions(subnetData, sortMethod))
    })
  }, [sortMethod, subnetData])

  // biome-ignore lint/correctness/useExhaustiveDependencies: legacy
  useEffect(() => {
    scrollContainerRef.current?.scrollTo(0, 0)
  }, [sortMethod, deferredSearch])

  const isConfirmDisabled =
    selectedSubnets.length === 0 || isLoadingPayload || !payload || !canSubmit

  return (
    <BittensorModalLayout
      header={
        <BittensorStakingModalHeader
          title={t("Select Subnets")}
          onBackClick={() => setStep("settings")}
          onCloseModal={close}
          withClose
        />
      }
    >
      <div className="flex size-full flex-col gap-6 overflow-hidden">
        <div className="flex items-center gap-4 px-12">
          <div className="grow">
            <SearchInputControlled
              containerClassName={cn(
                "h-[2.25rem] shrink-0 grow rounded-sm border border-field bg-field! px-4! text-sm ring-transparent focus-within:border-grey-700",
                "[&>button>svg]:size-10 [&>input]:text-sm [&>svg]:size-8"
              )}
              placeholder={t("Search subnets")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch("")}
              autoFocus
            />
          </div>
          <SortMethodButton method={sortMethod} onChange={handleSortMethodChange} />
        </div>

        <div className="flex w-full grow flex-col overflow-hidden">
          <ScrollContainer
            ref={scrollContainerRef}
            className="w-full grow"
            innerClassName="flex flex-col w-full bg-black-secondary"
          >
            <SubnetRows
              networkId={BITTENSOR_NETWORK_ID}
              subnets={displayedSubnets}
              selectedNetuids={selectedSubnets}
              isLoading={isLoading || isSubnetsLoading}
              onToggle={handleToggleSubnet}
            />
          </ScrollContainer>
        </div>

        <div className="flex flex-col gap-4 px-12 pb-12">
          <div className="flex h-8 items-center justify-between gap-8 text-body-secondary text-xs">
            <div className="whitespace-nowrap">{t("Estimated fee")}</div>
            <div className="overflow-hidden">
              <StakingFeeEstimate
                plancks={feeEstimate}
                tokenId={nativeToken?.id}
                isLoading={isLoadingFeeEstimate}
                error={errorFeeEstimate}
              />
            </div>
          </div>
          {isConfirmDisabled ? (
            <Button className="w-full" primary disabled>
              {t("Confirm")}
            </Button>
          ) : (
            <SapiSendButton
              containerId={BITTENSOR_SETTINGS_MODAL_CONTENT_CONTAINER_ID}
              label={t("Confirm")}
              payload={payload}
              onSubmitted={onSubmitted}
              txMetadata={txMetadata}
            />
          )}
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
      { label: t("UID"), value: "netuid" },
      { label: t("Emissions"), value: "emission" },
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

const SubnetRows: FC<{
  networkId: string
  subnets: SubnetData[]
  selectedNetuids: number[]
  isLoading?: boolean
  onToggle: (netuid: number) => void
}> = ({ networkId, subnets, selectedNetuids, isLoading, onToggle }) => {
  const { ref: refContainer } = useScrollContainer()
  const ref = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: subnets.length,
    estimateSize: () => 58,
    overscan: 5,
    getScrollElement: () => refContainer.current,
  })

  if (!subnets.length) return null

  return (
    <div ref={ref}>
      <div
        className="relative w-full"
        style={{
          height: `${virtualizer.getTotalSize()}px`,
        }}
      >
        {virtualizer.getVirtualItems().map((item) => {
          const subnet = subnets[item.index]
          if (!subnet || subnet.netuid === undefined) return null

          return (
            <div
              key={item.key}
              className="absolute top-0 left-0 w-full"
              style={{
                height: `${item.size}px`,
                transform: `translateY(${item.start}px)`,
              }}
            >
              <SubnetRow
                key={item.key}
                isSelected={selectedNetuids.includes(subnet.netuid)}
                option={subnet}
                networkId={networkId}
                onClick={() => onToggle(subnet.netuid!)}
                isLoading={isLoading}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

const SubnetRow: FC<{
  networkId: string
  option: SubnetData
  isSelected?: boolean
  isLoading?: boolean
  onClick: () => void
}> = ({ networkId, option, isSelected, isLoading, onClick }) => {
  const { t } = useTranslation()

  const dtaoTokenId = useMemo(
    () => subDTaoTokenId(networkId, option.netuid!),
    [networkId, option.netuid]
  )
  const tokenAlpha = useToken(dtaoTokenId, "substrate-dtao")

  const emission = useMemo(
    () =>
      // The Taostats emission field is per-block TAO-side only (dTAO splits 50/50 between TAO and alpha pools),
      // so we multiply by 2 to get the total emission rate.
      option.emission
        ? (Number(BigInt(option?.emission || 0) * 200n) / Number(ALPHA_PRICE_SCALE)).toFixed(2) +
          "%"
        : t("N/A"),
    [option.emission, t]
  )

  if (!tokenAlpha) return null

  return (
    <button
      type="button"
      key={option.netuid}
      onClick={onClick}
      className={cn(
        "flex h-14.5 w-full shrink-0 items-center gap-6 overflow-hidden px-12 pl-8 text-left hover:bg-grey-750 focus-visible:bg-grey-700",
        "disabled:cursor-not-allowed disabled:opacity-50"
      )}
    >
      <TokenLogo tokenId={tokenAlpha.id} className="size-16 shrink-0" />
      <div className="flex h-full grow flex-col justify-center gap-1 overflow-hidden text-sm">
        <div className="truncate text-white">
          {tokenAlpha.netuid} | {tokenAlpha.subnetName} {tokenAlpha.symbol}
        </div>
        <div className={cn("text-body-secondary text-xs", isLoading && "animate-pulse")}>
          {t("Emissions")}: {emission}
        </div>
      </div>
      <div
        className={cn(
          "mx-2 h-4 w-4 shrink-0 rounded-full",
          isSelected ? "bg-primary" : "bg-grey-700"
        )}
      />
    </button>
  )
}
