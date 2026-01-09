import { ALPHA_PRICE_SCALE } from "@talismn/balances"
import { subDTaoTokenId } from "@talismn/chaindata-provider"
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
  Button,
  ContextMenu,
  ContextMenuContent,
  ContextMenuOptionItem,
  ContextMenuTrigger,
} from "talisman-ui"

import { ScrollContainer, useScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInputControlled } from "@talisman/components/SearchInputControlled"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { type SubnetData } from "@ui/domains/Staking/hooks/bittensor/dTao/types"
import { useCombinedSubnetData } from "@ui/domains/Staking/hooks/bittensor/dTao/useCombinedSubnetData"
import { useGetBittensorClaimTypePayload } from "@ui/domains/Staking/hooks/bittensor/dTao/useGetBittensorClaimTypePayload"
import { SapiSendButton } from "@ui/domains/Transactions/SapiSendButton"
import { useToken } from "@ui/state"

import { BittensorStakingModalHeader } from "../../components/BittensorModalHeader"
import { BittensorModalLayout } from "../../components/BittensorModalLayout"
import {
  BITTENSOR_CLAIM_SETTINGS_MODAL_CONTENT_CONTAINER_ID,
  BITTENSOR_NETWORK_ID,
} from "../constants"
import { useBittensorClaimSettingsModal } from "../hooks/useBittensorClaimSettingsModal"
import { useBittensorClaimSettingsWizard } from "../hooks/useBittensorClaimSettingsWizard"

type SortValue = "netuid" | "price" | "total_tao" | "total_alpha" | "emission"

const sortSubnetOptions = (data: SubnetData[], sortBy: SortValue): SubnetData[] => {
  const descendingFilters: SortValue[] = ["total_alpha", "total_tao", "emission"]
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
    account,
    nativeToken,
    selectedSubnets,
    setSelectedSubnets,
    claimTypeData,
    canSubmit,
    onSubmitted,
  } = useBittensorClaimSettingsWizard()
  const { close } = useBittensorClaimSettingsModal()
  const [sortMethod, setSortMethod] = useState<SortValue>("netuid")
  const [search, setSearch] = useState<string>("")
  const deferredSearch = useDeferredValue(search)

  // Track the initially confirmed subnets (from chain) - these stay at the top
  const confirmedSubnetsRef = useRef<number[]>(claimTypeData?.subnets ?? [])

  const { subnetData, isLoading, isSubnetsLoading } = useCombinedSubnetData(BITTENSOR_NETWORK_ID)

  useEffect(() => {
    if (claimTypeData?.subnets) {
      confirmedSubnetsRef.current = claimTypeData.subnets
    }
  }, [claimTypeData?.subnets])

  const [sortedSubnets, setSortedSubnets] = useState<SubnetData[]>(() =>
    sortSubnetOptions(subnetData, sortMethod),
  )

  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const displayedSubnets = useMemo(() => {
    const lowerSearch = deferredSearch.toLowerCase()
    const filtered = sortedSubnets.filter((subnet) => {
      const { netuid, subnet_name, symbol } = subnet
      const subnetName = `${netuid} ${subnet_name} ${symbol}`.toLowerCase()
      return subnetName.includes(lowerSearch)
    })

    // Put confirmed subnets at the top, maintaining their relative order
    const confirmedNetuids = confirmedSubnetsRef.current
    const confirmed = filtered.filter(
      (s) => s.netuid !== undefined && confirmedNetuids.includes(s.netuid),
    )
    const others = filtered.filter(
      (s) => s.netuid === undefined || !confirmedNetuids.includes(s.netuid),
    )

    return [...confirmed, ...others]
  }, [deferredSearch, sortedSubnets])

  const handleToggleSubnet = useCallback(
    (netuid: number) => {
      setSelectedSubnets(
        selectedSubnets.includes(netuid)
          ? selectedSubnets.filter((id) => id !== netuid)
          : [...selectedSubnets, netuid],
      )
    },
    [selectedSubnets, setSelectedSubnets],
  )

  const [, startTransition] = useTransition()

  useEffect(() => {
    startTransition(() => {
      setSortedSubnets(sortSubnetOptions(subnetData, sortMethod))
    })
  }, [sortMethod, subnetData])

  useEffect(() => {
    scrollContainerRef.current?.scrollTo(0, 0)
  }, [sortMethod, deferredSearch])

  const { data: setClaimTypePayload, isLoading: isPayloadLoading } =
    useGetBittensorClaimTypePayload({
      networkId: nativeToken?.networkId,
      address: account?.address,
      claimType: "KeepSubnets",
      selectedSubnets,
    })

  const isConfirmDisabled =
    selectedSubnets.length === 0 || isPayloadLoading || !setClaimTypePayload?.payload || !canSubmit

  return (
    <BittensorModalLayout
      header={
        <BittensorStakingModalHeader
          title={t("Select Subnets")}
          onBackClick={() => setStep("claim-settings")}
          onCloseModal={close}
          withClose
        />
      }
    >
      <div className="flex size-full flex-col gap-6 overflow-hidden">
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

        <div className="px-12 pb-12">
          {isConfirmDisabled ? (
            <Button className="w-full" primary disabled>
              {t("Confirm")}
            </Button>
          ) : (
            <SapiSendButton
              containerId={BITTENSOR_CLAIM_SETTINGS_MODAL_CONTENT_CONTAINER_ID}
              label={t("Confirm")}
              payload={setClaimTypePayload?.payload}
              onSubmitted={onSubmitted}
              txMetadata={setClaimTypePayload?.txMetadata}
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
              className="absolute left-0 top-0 w-full"
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
    [networkId, option.netuid],
  )
  const tokenAlpha = useToken(dtaoTokenId, "substrate-dtao")

  const emission = useMemo(
    () =>
      option.emission
        ? (Number(BigInt(option?.emission || 0) * 100n) / Number(ALPHA_PRICE_SCALE)).toFixed(2) +
          "%"
        : t("N/A"),
    [option.emission, t],
  )

  if (!tokenAlpha) return null

  return (
    <button
      type="button"
      key={option.netuid}
      onClick={onClick}
      className={classNames(
        "hover:bg-grey-750 focus-visible:bg-grey-700 flex h-[5.8rem] w-full shrink-0 items-center gap-6 overflow-hidden px-12 pl-8 text-left",
        "disabled:cursor-not-allowed disabled:opacity-50",
        isSelected && "bg-grey-800",
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
        className={classNames(
          "mx-2 h-4 w-4 shrink-0 rounded-full",
          isSelected ? "bg-primary" : "bg-grey-700",
        )}
      />
    </button>
  )
}
