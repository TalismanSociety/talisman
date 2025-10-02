import { ChevronDownIcon, ChevronRightIcon, ZapFastIcon } from "@talismn/icons"
import { classNames, LoadableStatus } from "@talismn/util"
import { DefiPosition } from "extension-core"
import { TALISMAN_WEB_APP_STAKING_URL } from "extension-shared"
import { FC, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useLocation, useNavigate } from "react-router-dom"

// import { Fiat } from "@ui/domains/Asset/Fiat"
import { AssetLogo } from "@ui/domains/Asset/AssetLogo"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { AssetBalanceCellValue } from "@ui/domains/Portfolio/AssetBalanceCellValue"
import { PortfolioAccount } from "@ui/domains/Portfolio/AssetDetails/PortfolioAccount"
import { PositionSymbol } from "@ui/domains/Portfolio/DeFi/PositionSymbol"
import { PositionTotal } from "@ui/domains/Portfolio/DeFi/PositionTotal"
import { PositionType } from "@ui/domains/Portfolio/DeFi/PositionType"
import { usePortfolioNavigation } from "@ui/domains/Portfolio/usePortfolioNavigation"
// import { DefiPositionRow } from "@ui/domains/Portfolio/DeFi/PopupDefiPositions"

// import { useYieldBalances } from "@ui/domains/Earn/hooks/useYieldBalances"
import {
  useAccounts,
  useDefiPositionsDisplay,
  usePortfolioGlobalData,
  usePortfolioSelectedAccounts,
} from "@ui/state"

// import { SearchInput } from "@talisman/components/SearchInput"
// import { setPortfolioSearch, usePortfolioSearch } from "@ui/state"

// import { DefiAssetRow } from "./DefiAssetRow"

interface GroupedTokenData {
  tokenSymbol: string
  totalAmountUsd: number
  positions: Array<{
    position: DefiPosition
    amountUsd: number
  }>
  holdingsCount: number
}

// DefiPositionRow copied from PopupDefiPositions
const DefiPositionRow: FC<{
  position: DefiPosition
  status: LoadableStatus
  noCountUp: boolean
}> = ({ position, status, noCountUp }) => {
  const selectedAccounts = usePortfolioSelectedAccounts()
  const navigate = useNavigate()

  if (position.id === "SHIMMER")
    return (
      <div className="bg-grey-850 flex h-28 w-full items-center gap-4 rounded-sm px-6">
        <div className="bg-body-disabled size-16 shrink-0 animate-pulse rounded-full"></div>
        <div className="flex grow flex-col gap-2">
          <div className="flex w-full animate-pulse items-center justify-between text-sm font-bold">
            <div className="text-body-disabled bg-body-disabled rounded-xs">Protocol</div>
            <div className="text-body-disabled bg-body-disabled rounded-xs">TKN/TKN</div>
          </div>
          <div className="flex w-full animate-pulse items-center justify-between text-xs font-normal">
            <div className="text-body-disabled bg-body-disabled rounded-xs">Account name</div>
            <div className="text-body-disabled bg-body-disabled rounded-xs">Amount USD</div>
          </div>
        </div>
      </div>
    )

  return (
    <button
      type="button"
      className={classNames(
        "bg-grey-850 hover:bg-grey-800 flex h-28 w-full items-center gap-4 overflow-hidden rounded-sm px-6",
      )}
      onClick={() => navigate(`/portfolio/defi/${position.id}`)}
    >
      <AssetLogo url={position.defiLogoUrl} className="size-16" />
      <div className="flex w-full grow flex-col gap-2 overflow-hidden">
        <div className="flex w-full items-center justify-between gap-6 overflow-hidden text-sm font-bold">
          <div className="flex max-w-full items-center gap-3 overflow-hidden">
            <div className="truncate">{position.defiName}</div>
            <NetworkLogo networkId={position.networkId} className="inline-block" />
            <div className="text-body-secondary border-grey-500 rounded-xs border-[0.2rem] px-2 py-1 text-[0.8rem]">
              {position.type.toLocaleUpperCase()}
            </div>
          </div>
          <div className="max-w-[50%] shrink-0 truncate">
            <PositionSymbol position={position} />
          </div>
        </div>
        <div className="text-body-secondary flex w-full items-center justify-between gap-6 text-xs font-normal">
          <div className="truncate">
            {selectedAccounts?.length === 1 ? (
              <PositionType type={position.type} />
            ) : (
              <PortfolioAccount address={position.address} />
            )}
          </div>
          <div className={classNames(status === "loading" && "animate-pulse")}>
            <PositionTotal position={position} noCountUp={noCountUp} />
          </div>
        </div>
      </div>
    </button>
  )
}

const DefiTokenRow: FC<{
  tokenData: GroupedTokenData
}> = ({ tokenData }) => {
  const { t } = useTranslation()
  const [isExpanded, setIsExpanded] = useState(false)

  const handleToggle = useCallback(() => {
    setIsExpanded(!isExpanded)
  }, [isExpanded])

  // Calculate total token amount from all positions
  const totalTokenAmount = useMemo(() => {
    return tokenData.positions.reduce((total, { position }) => {
      const posAmount = position.breakdown.reduce(
        (sum, item) => sum + Number(item.amount || 0) / Math.pow(10, item.decimals || 0),
        0,
      )
      return total + posAmount
    }, 0)
  }, [tokenData.positions])

  return (
    <div className="bg-grey-850 flex w-full flex-col gap-3">
      {/* Token Row - matching DashboardAssetRow style */}
      <button
        type="button"
        onClick={handleToggle}
        className={classNames(
          "text-body-secondary bg-grey-850 hover:bg-grey-800 flex w-full items-center justify-between overflow-hidden rounded px-8 py-4 text-left text-base",
        )}
      >
        {/* Left section - Logo and Token Info */}
        <div className="flex items-center gap-4">
          <div className="shrink-0 text-xl">
            <AssetLogo
              tokenId={undefined}
              url={
                tokenData.positions[0]?.position.breakdown[0]?.logo ||
                tokenData.positions[0]?.position.defiLogoUrl ||
                null
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-body flex items-center gap-2 text-base font-bold">
              {tokenData.tokenSymbol}
              <NetworkLogo
                networkId={tokenData.positions[0]?.position.networkId}
                className="text-[1rem]"
              />
            </div>
            <div className="text-body-secondary text-sm">
              {tokenData.holdingsCount}{" "}
              {tokenData.holdingsCount === 1 ? t("holding") : t("holdings")}
            </div>
          </div>
        </div>

        {/* Right section - Token/Fiat Amount and Expand Icon */}
        <div className="flex items-center gap-4">
          <AssetBalanceCellValue
            tokens={totalTokenAmount}
            fiat={tokenData.totalAmountUsd}
            symbol={tokenData.tokenSymbol}
            className="!h-auto !p-0"
          />
          <div className="flex items-center">
            {isExpanded ? (
              <ChevronDownIcon className="h-8 w-8 text-white" />
            ) : (
              <ChevronRightIcon className="h-8 w-8 text-white" />
            )}
          </div>
        </div>
      </button>

      {/* Expanded Positions - part of same row background */}
      {isExpanded && (
        <div className="bg-grey-850 flex flex-col gap-4 pb-4 pl-8 pr-8">
          {tokenData.positions.map(({ position }) => (
            <DefiPositionRow
              key={position.poolAddress + position.address}
              position={position}
              status="success"
              noCountUp={false}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const EarnTokenRowSkeleton: FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={classNames(
        "text-body-secondary bg-grey-850 mb-4 mt-4 grid w-full grid-cols-[40%_30%_30%] rounded text-left text-base",
        className,
      )}
    >
      <div>
        <div className="flex h-[6.6rem]">
          <div className="p-8 text-xl">
            <div className="bg-grey-700 h-16 w-16 animate-pulse rounded-full"></div>
          </div>
          <div className="flex grow flex-col justify-center gap-2">
            <div className="bg-grey-700 rounded-xs h-8 w-20 animate-pulse"></div>
          </div>
        </div>
      </div>
      <div></div>
      <div>
        <div className="flex h-full flex-col items-end justify-center gap-2 px-8">
          <div className="bg-grey-700 rounded-xs h-8 w-[10rem] animate-pulse"></div>
          <div className="bg-grey-700 rounded-xs h-8 w-[6rem] animate-pulse"></div>
        </div>
      </div>
    </div>
  )
}

const StakingTile = () => {
  const { t } = useTranslation()

  const handleStakingClick = () => {
    window.open(TALISMAN_WEB_APP_STAKING_URL, "_blank")
  }

  return (
    <button
      type="button"
      className="bg-grey-850 hover:bg-grey-800 mb-4 flex h-[6.6rem] w-full cursor-pointer items-center justify-between rounded px-8 text-left transition-colors"
      onClick={handleStakingClick}
    >
      <div className="flex items-center gap-6">
        <ZapFastIcon className="text-primary h-8 w-8" />
        <div className="flex flex-col">
          <div className="text-body text-base font-bold">{t("Staking")}</div>
        </div>
      </div>
      <div className="text-body-secondary text-sm">
        {t("Go to Talisman Portal for more staking")}
      </div>
    </button>
  )
}

export const EarnAssetsTab = () => {
  const { t } = useTranslation()
  const { isInitialising } = usePortfolioGlobalData()
  const { selectedAccount, selectedFolder } = usePortfolioNavigation()
  // const { groupedByToken, isLoading: isYieldLoading } = useYieldBalances()
  const positions = useDefiPositionsDisplay()
  const accounts = useAccounts("owned")
  // const search = usePortfolioSearch()

  const location = useLocation()

  // Get owned account addresses to filter out watched accounts
  const ownedAddresses = useMemo(() => {
    return new Set(accounts.map((account) => account.address))
  }, [accounts])

  // Group DeFi positions by token symbol (excluding watched accounts)
  const groupedByToken = useMemo(() => {
    if (!positions.data?.length) return new Map<string, GroupedTokenData>()

    const grouped = new Map<string, GroupedTokenData>()

    positions.data.forEach((position) => {
      // Skip positions from watched accounts
      if (!ownedAddresses.has(position.address)) {
        return
      }

      // Extract token symbol from position breakdown
      const tokenSymbol = position.breakdown[0]?.symbol || position.symbol || "Unknown"
      const positionValue = position.breakdown.reduce((sum, item) => sum + item.valueUsd, 0)

      const existing = grouped.get(tokenSymbol)
      if (existing) {
        existing.positions.push({ position, amountUsd: positionValue })
        existing.totalAmountUsd += positionValue
        existing.holdingsCount += 1
      } else {
        grouped.set(tokenSymbol, {
          tokenSymbol,
          totalAmountUsd: positionValue,
          positions: [{ position, amountUsd: positionValue }],
          holdingsCount: 1,
        })
      }
    })

    return grouped
  }, [positions.data, ownedAddresses])

  // Show grouped assets instead of individual positions
  const hasDefiAssets = groupedByToken.size > 0
  const isYieldLoading = positions.status === "loading"

  if (!hasDefiAssets && !isInitialising && !isYieldLoading) {
    return (
      <div className="text-body-secondary bg-grey-850 mb-4 flex h-[6.6rem] flex-col justify-center rounded-sm p-8">
        {selectedAccount
          ? t("No staking positions found for this account.")
          : selectedFolder
            ? t("No staking positions found in this folder.")
            : t("No staking positions found.")}
      </div>
    )
  }

  return (
    <div key={location.key} className="text-body-secondary min-w-[45rem] text-left text-base">
      {/* Staking Section */}
      <div className="mb-4">
        <h2 className="text-body-secondary mb-4 text-sm font-medium">{t("Staking")}</h2>
        <StakingTile />
      </div>

      {/* Defi Section */}
      {hasDefiAssets && (
        <div className="mb-6">
          <h2 className="text-body-secondary mb-4 text-sm font-medium">{t("Defi")}</h2>
          <div className="flex flex-col gap-4">
            {Array.from(groupedByToken.entries()).map(([tokenSymbol, tokenData]) => (
              <DefiTokenRow key={tokenSymbol + tokenData.totalAmountUsd} tokenData={tokenData} />
            ))}
          </div>
        </div>
      )}
      {(isInitialising || isYieldLoading) && <EarnTokenRowSkeleton />}
    </div>
  )
}
