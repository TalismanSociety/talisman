import {
  type DotNetworkId,
  type SubDTaoToken,
  subNativeTokenId,
  type TokenId,
} from "@talismn/chaindata-provider"
import { PieChartIcon } from "@talismn/icons"
import { Button } from "@ui/components/Button"
import { Modal } from "@ui/components/Modal"
import { ScrollContainer } from "@ui/components/ScrollContainer"
import { SearchInputControlled } from "@ui/components/SearchInputControlled"
import { Tooltip, TooltipContent, TooltipTrigger, useTooltipContext } from "@ui/components/Tooltip"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { BittensorValidatorName } from "@ui/domains/Portfolio/AssetDetails/DashboardTokenBalances/BittensorValidatorName"
import { useTokens } from "@ui/state/chaindata"
import { cn } from "@ui/util/cn"
import { type FC, type MouseEvent, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useBittensorRootWeights } from "../hooks/useBittensorRootWeights"
import { ROOT_NETUID } from "../utils/constants"
import { getRootWeightsBreakdown } from "../utils/rootWeights"

const SLICE_COLORS = [
  "#d5ff5c",
  "#8b8bf9",
  "#f55cb1",
  "#ffb056",
  "#5cd8ff",
  "#7bdca4",
  "#ffe45c",
  "#e08bff",
]
const OTHERS_COLOR = "#5a5a5a"

type DonutSlice = { label: string; percent: number; color: string; tokenId?: TokenId }

const useSubnetTokensByNetuid = (networkId: DotNetworkId | undefined) => {
  const tokens = useTokens()

  return useMemo(
    () =>
      new Map(
        tokens
          .filter(
            (token): token is SubDTaoToken =>
              token.type === "substrate-dtao" && !token.hotkey && token.networkId === networkId
          )
          .map((token) => [token.netuid, token])
      ),
    [tokens, networkId]
  )
}

const useRootWeightsSlices = (networkId: DotNetworkId | undefined, hotkey: string) => {
  const { t } = useTranslation()
  const { data: weights, isLoading, isError } = useBittensorRootWeights(networkId, hotkey)
  const subnetTokens = useSubnetTokensByNetuid(networkId)

  const breakdown = useMemo(() => {
    const raw = weights ? getRootWeightsBreakdown(weights) : null
    if (!raw) return null

    const getLabel = (netuid: number) => {
      if (netuid === ROOT_NETUID) return "TAO"
      const name = subnetTokens.get(netuid)?.subnetName
      return name ? `SN${netuid} ${name}` : `SN${netuid}`
    }

    const getTokenId = (netuid: number) => {
      if (netuid === ROOT_NETUID) return networkId ? subNativeTokenId(networkId) : undefined
      return subnetTokens.get(netuid)?.id
    }

    const toDonutSlice = ({ netuid, ratio }: { netuid: number; ratio: number }, index: number) => ({
      label: getLabel(netuid),
      percent: ratio * 100,
      color: SLICE_COLORS[index] ?? OTHERS_COLOR,
      tokenId: getTokenId(netuid),
    })

    const topSlices = raw.topSlices.map<DonutSlice>(toDonutSlice)
    const othersPercent = raw.othersRatio * 100
    const slices =
      othersPercent >= 0.05
        ? [...topSlices, { label: t("Others"), percent: othersPercent, color: OTHERS_COLOR }]
        : topSlices

    return {
      subnetCount: raw.subnetCount,
      slices,
      allSlices: raw.allSlices.map<DonutSlice>(toDonutSlice),
    }
  }, [weights, subnetTokens, networkId, t])

  return { breakdown, isLoading, isError }
}

const RootWeightsDonut: FC<{ subnetCount: number; slices: DonutSlice[] }> = ({
  subnetCount,
  slices,
}) => {
  let startPercent = 0

  return (
    <div className="relative shrink-0">
      {/* r chosen so the circumference is 100: dash lengths are percentages */}
      <svg className="size-[64px]" viewBox="0 0 36 36">
        {slices.map((slice) => {
          const dashOffset = 25 - startPercent
          startPercent += slice.percent
          return (
            <circle
              key={slice.label}
              cx="18"
              cy="18"
              r="15.9155"
              fill="none"
              stroke={slice.color}
              strokeWidth="3"
              strokeDasharray={`${slice.percent} ${100 - slice.percent}`}
              strokeDashoffset={dashOffset}
            />
          )
        })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-body text-sm">
        {subnetCount}
      </div>
    </div>
  )
}

const SliceRow: FC<{
  slice: DonutSlice
  decimals?: number
  withLogo?: boolean
  className?: string
}> = ({ slice, decimals = 1, withLogo, className }) => (
  <div className={cn("flex w-full items-center justify-between gap-4", className)}>
    <div className="flex min-w-0 items-center gap-3">
      {withLogo ? (
        <TokenLogo tokenId={slice.tokenId} className="size-10 shrink-0" />
      ) : (
        <div className="size-3 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} />
      )}
      <div className="truncate text-body-secondary">{slice.label}</div>
    </div>
    <div className="shrink-0 text-body">{slice.percent.toFixed(decimals)}%</div>
  </div>
)

const ViewAllButton: FC<{ onClick: () => void }> = ({ onClick }) => {
  const { t } = useTranslation()
  const { setOpen } = useTooltipContext()

  const handleClick = (e: MouseEvent) => {
    // the stat lives inside the row button: don't let the click select the validator
    e.stopPropagation()
    setOpen(false)
    onClick()
  }

  return (
    <button
      type="button"
      className="text-grey-300 text-xs underline hover:text-body"
      onClick={handleClick}
    >
      {t("View all")}
    </button>
  )
}

/**
 * Rendered by the rows container, not by the stat: a virtualized row unmounts as soon as it leaves
 * the viewport and would take an inlined modal down with it.
 */
export const RootWeightsViewAllModal: FC<{
  networkId: DotNetworkId | undefined
  hotkey: string
  containerId?: string
  isOpen: boolean
  onDismiss: () => void
}> = ({ networkId, hotkey, containerId, isOpen, onDismiss }) => {
  const { t } = useTranslation()
  const { breakdown } = useRootWeightsSlices(networkId, hotkey)

  const [search, setSearch] = useState("")

  useEffect(() => {
    if (isOpen) setSearch("")
  }, [isOpen])

  const filteredSlices = useMemo(() => {
    if (!breakdown) return []
    const lowerSearch = search.toLowerCase()
    return breakdown.allSlices.filter((slice) => slice.label.toLowerCase().includes(lowerSearch))
  }, [breakdown, search])

  return (
    <Modal containerId={containerId} isOpen={isOpen} onDismiss={onDismiss} className="size-full">
      <WizardModalDialog
        onBackClick={onDismiss}
        className="border-none"
        contentClassName="overflow-hidden! p-0! flex flex-col gap-4"
        title={
          <div className="flex h-full items-center justify-center gap-4 overflow-hidden">
            <AccountIcon address={hotkey} className="size-12 shrink-0 text-lg" />
            <BittensorValidatorName
              hotkey={hotkey}
              noTooltip
              className="truncate font-bold text-body"
            />
          </div>
        }
      >
        <div className="flex flex-col gap-8 px-12">
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
        <ScrollContainer className="grow" innerClassName="flex flex-col">
          {filteredSlices.map((slice) => (
            <SliceRow
              key={slice.label}
              slice={slice}
              decimals={2}
              withLogo
              className="p-3 px-12 text-sm hover:bg-grey-800"
            />
          ))}
          {!filteredSlices.length && (
            <div className="py-8 text-center text-body-secondary">{t("No subnets found")}</div>
          )}
        </ScrollContainer>
        <div className="shrink-0 px-12 pb-12">
          <Button fullWidth onClick={onDismiss}>
            {t("Close")}
          </Button>
        </div>
      </WizardModalDialog>
    </Modal>
  )
}

export const RootWeightsStat: FC<{
  networkId: DotNetworkId | undefined
  hotkey: string
  onViewAll?: () => void
}> = ({ networkId, hotkey, onViewAll }) => {
  const { t } = useTranslation()
  const { breakdown, isLoading, isError } = useRootWeightsSlices(networkId, hotkey)

  if (isLoading) return <div className="h-6 w-14 animate-pulse rounded-xs bg-grey-800" />
  if (isError) return null

  if (!breakdown)
    return (
      <Tooltip placement="left">
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <PieChartIcon />
            <span>–</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>{t("No allocation set — earnings follow subnet emissions")}</TooltipContent>
      </Tooltip>
    )

  return (
    <Tooltip placement="left" interactive>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2">
          <PieChartIcon />
          {breakdown.subnetCount}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="flex w-[200px] max-w-[200px] flex-col items-center gap-4 p-4">
          <RootWeightsDonut subnetCount={breakdown.subnetCount} slices={breakdown.slices} />
          <div className="flex w-full flex-col gap-2">
            {breakdown.slices.map((slice) => (
              <SliceRow key={slice.label} slice={slice} />
            ))}
          </div>
          {onViewAll && <ViewAllButton onClick={onViewAll} />}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
