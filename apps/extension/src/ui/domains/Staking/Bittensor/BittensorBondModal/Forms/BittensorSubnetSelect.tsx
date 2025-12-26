import { ALPHA_PRICE_SCALE } from "@talismn/balances"
import { subDTaoTokenId, subNativeTokenId } from "@talismn/chaindata-provider"
import { ToolbarSortIcon } from "@talismn/icons"
import { classNames, cn } from "@talismn/util"
import { useVirtualizer } from "@tanstack/react-virtual"
import {
  FC,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react"
import { useTranslation } from "react-i18next"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuOptionItem,
  ContextMenuTrigger,
} from "talisman-ui"

import { ScrollContainer, useScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInputControlled } from "@talisman/components/SearchInputControlled"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { type SubnetData } from "@ui/domains/Staking/hooks/bittensor/dTao/types"
import { useCombinedSubnetData } from "@ui/domains/Staking/hooks/bittensor/dTao/useCombinedSubnetData"
import { useToken } from "@ui/state"

import { BittensorStakingModalHeader } from "../../components/BittensorModalHeader"
import { BittensorModalLayout } from "../../components/BittensorModalLayout"
import { useBittensorBondModal } from "../../hooks/useBittensorBondModal"
import { useBittensorBondWizard } from "../../hooks/useBittensorBondWizard"
import { BittensorAlphaPrice } from "../BittensorAlphaPrice"

type SortValue = "netuid" | "price" | "total_tao" | "total_alpha" | "emission"

const sortSubnetOptions = (data: SubnetData[], sortBy: SortValue): SubnetData[] => {
  const descendingFilters: SortValue[] = ["total_alpha", "total_tao", "emission"]
  const sorted = data
    .filter((sn) => sn.netuid)
    .sort((a, b) => {
      if (descendingFilters.includes(sortBy)) {
        // Sort other fields in descending order
        if (Number(a[sortBy] || 0) > Number(b[sortBy] || 0)) return -1
        if (Number(a[sortBy] || 0) < Number(b[sortBy] || 0)) return 1

        return 0 // Keep them in the same place if equal
      } else {
        // Sort other fields in ascending order
        if (Number(a[sortBy] || 0) < Number(b[sortBy] || 0)) return -1
        if (Number(a[sortBy] || 0) > Number(b[sortBy] || 0)) return 1

        return 0 // Keep them in the same place if equal
      }
    })

  return sorted
}

export const BittensorSubnetSelect = () => {
  const { t } = useTranslation()
  const { setStep, setNetuid, netuid, networkId } = useBittensorBondWizard()
  const { close } = useBittensorBondModal()
  const [sortMethod, setSortMethod] = useState<SortValue>("netuid") // netuid doesnt cause flickering
  const [search, setSearch] = useState<string>("")
  const deferredSearch = useDeferredValue(search)

  const { subnetData, isLoading, isSubnetsLoading } = useCombinedSubnetData(networkId)

  const [sortedSubnets, setSortedSubnets] = useState<SubnetData[]>(() =>
    sortSubnetOptions(subnetData, sortMethod),
  )

  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const displayedSubnets = useMemo(() => {
    const lowerSearch = deferredSearch.toLowerCase()
    return sortedSubnets.filter((subnet) => {
      const { netuid, subnet_name, symbol } = subnet
      const subnetName = `${netuid} ${subnet_name} ${symbol}`.toLowerCase()
      return subnetName.includes(lowerSearch)
    })
  }, [deferredSearch, sortedSubnets])

  const handleSubmit = useCallback(
    (netuid: number) => {
      setNetuid(netuid)
      setStep("form")
    },
    [setNetuid, setStep],
  )

  const [, startTransition] = useTransition()

  useEffect(() => {
    startTransition(() => {
      setSortedSubnets(sortSubnetOptions(subnetData, sortMethod))
    })
  }, [sortMethod, subnetData])

  // Reset scroll to top when sort method or search changes
  useEffect(() => {
    scrollContainerRef.current?.scrollTo(0, 0)
  }, [sortMethod, deferredSearch])

  return (
    <BittensorModalLayout
      header={
        <BittensorStakingModalHeader
          title={t("Select Subnet")}
          onBackClick={() => setStep("form")}
          onCloseModal={close}
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
              placeholder={t("Search subnets")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch("")}
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
            />
          </div>
          <SortMethodButton method={sortMethod} onChange={(method) => setSortMethod(method)} />
        </div>

        <div className="flex w-full grow flex-col gap-2 overflow-hidden">
          <div className="text-body-disabled flex justify-between pl-[6rem] pr-12 text-sm">
            <div>{t("Name / Pool")}</div>
            <div>{t("Emissions / Alpha Price")}</div>
          </div>
          <ScrollContainer
            ref={scrollContainerRef}
            className="w-full grow"
            innerClassName="flex flex-col w-full bg-black-secondary"
          >
            <SubnetRows
              networkId={networkId}
              subnets={displayedSubnets}
              selectedNetuid={netuid}
              isLoading={isLoading || isSubnetsLoading}
              onSelect={handleSubmit}
            />
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
      { label: t("UID"), value: "netuid" },
      { label: t("Alpha in Pool"), value: "total_alpha" },
      { label: t("TAO in Pool"), value: "total_tao" },
      { label: t("Emissions"), value: "emission" },
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
          className="bg-field hover:bg-grey-800 text-body-secondary hover:text-grey-300 border-grey-850 flex h-full items-center gap-4 text-nowrap rounded-sm border px-[8px] py-[6px] text-sm"
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
  selectedNetuid?: number | null
  isLoading?: boolean
  onSelect: (netuid: number) => void
}> = ({ networkId, subnets, selectedNetuid, isLoading, onSelect }) => {
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
          if (!subnet) return null

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
              <SubnetRow
                key={item.key}
                isSelected={subnet.netuid === selectedNetuid}
                option={subnet}
                networkId={networkId}
                onClick={() => onSelect(subnet.netuid!)}
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

  const [taoTokenId, dtaoTokenId] = useMemo(
    () => [subNativeTokenId(networkId), subDTaoTokenId(networkId, option.netuid!)] as const,
    [networkId, option.netuid],
  )
  const tokanAlpha = useToken(dtaoTokenId, "substrate-dtao")

  const emission = useMemo(
    () =>
      option.emission
        ? (Number(BigInt(option?.emission || 0) * 100n) / Number(ALPHA_PRICE_SCALE)).toFixed(2) +
          "%"
        : t("N/A"),
    [option.emission, t],
  )

  if (!tokanAlpha) return null

  return (
    <button
      type="button"
      key={option.netuid}
      onClick={onClick}
      className={classNames(
        "hover:bg-grey-750 focus:bg-grey-700 flex h-[5.8rem] w-full shrink-0 items-center gap-6 overflow-hidden px-12 pl-8 text-left",
        "disabled:cursor-not-allowed disabled:opacity-50",
        isSelected && "bg-grey-800 text-body-secondary",
      )}
    >
      <TokenLogo tokenId={tokanAlpha.id} className="size-16 shrink-0" />
      <div className="flex h-full grow flex-col justify-center gap-2 overflow-hidden text-sm">
        <div className="flex w-full items-center justify-between gap-8 overflow-hidden text-white">
          <div className="truncate">
            {tokanAlpha.netuid} | {tokanAlpha.subnetName} {tokanAlpha.symbol}
          </div>
          <div className={cn("shrink-0", isLoading && "animate-pulse")}>{emission}</div>
        </div>

        {!!option.total_tao && (
          <div
            className={cn(
              "text-body-secondary flex w-full items-center justify-between gap-8 overflow-hidden text-xs",
              isLoading && "animate-pulse",
            )}
          >
            <div className="flex grow items-center gap-2 overflow-hidden">
              <TokensAndFiat
                tokenId={taoTokenId}
                planck={option.total_tao}
                noFiat
                noCountUp
                noTooltip
              />
              <div className="bg-body-disabled inline-block size-2 rounded-full" />
              <TokensAndFiat
                tokenId={tokanAlpha.id}
                planck={option.total_alpha}
                noFiat
                noCountUp
                noTooltip
              />
            </div>
            <div className="shrink-0">
              <BittensorAlphaPrice
                taoTokenId={taoTokenId}
                price={option.price}
                priceChange24h={option.price_change_1_day}
              />
            </div>
          </div>
        )}
      </div>
    </button>
  )
}
