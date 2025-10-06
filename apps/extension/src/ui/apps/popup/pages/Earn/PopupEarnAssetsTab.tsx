import { ChevronDownIcon, ChevronRightIcon, ExternalLinkIcon, ZapIcon } from "@talismn/icons"
import { YieldPositionBalance, YieldProduct } from "extension-core"
import { TALISMAN_WEB_APP_STAKING_URL } from "extension-shared"
import { FC, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { AssetLogo } from "@ui/domains/Asset/AssetLogo"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { useYieldBalances } from "@ui/domains/Earn/hooks/useYieldBalances"
import { mapYieldNetworkToNetworkId } from "@ui/domains/Earn/utils/networkMapping"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { PortfolioAccount } from "@ui/domains/Portfolio/AssetDetails/PortfolioAccount"
import { useAccounts } from "@ui/state"

interface GroupedTokenData {
  tokenSymbol: string
  totalAmountUsd: number
  positions: Array<{
    balance: YieldPositionBalance
    yieldId: string
    amountUsd: number
    product?: YieldProduct
  }>
  holdingsCount: number
}

// YieldPositionRow for yield balances - clickable like dashboard
const PopupYieldPositionRow: FC<{
  balance: YieldPositionBalance
  yieldId: string
  product?: YieldProduct
}> = ({ balance, yieldId, product }) => {
  const navigate = useNavigate()
  const accounts = useAccounts("owned")

  const handleClick = useCallback(() => {
    navigate(`/portfolio/yield/${yieldId}`)
  }, [navigate, yieldId])

  return (
    <button
      type="button"
      className="bg-grey-850 hover:bg-grey-800 flex h-auto w-full items-center gap-3 overflow-hidden rounded-sm p-4"
      onClick={handleClick}
    >
      <AssetLogo url={product?.metadata.logoURI || balance.token.logoURI} className="size-12" />
      <div className="flex w-full grow flex-col gap-2 overflow-hidden">
        <div className="flex w-full items-center justify-between gap-4 overflow-hidden text-xs font-bold">
          <div className="flex max-w-full items-center gap-3 overflow-hidden">
            <div className="truncate text-white" title={product?.metadata.name ?? undefined}>
              {product?.metadata.name}
            </div>
            <NetworkLogo
              networkId={mapYieldNetworkToNetworkId(product?.network) || balance.token.network}
              className="inline-block"
            />
          </div>
          <div className="w-[16rem] shrink-0">
            <div className="flex w-full flex-col items-end gap-1 overflow-hidden">
              <div className="text-body-secondary flex items-center gap-2 overflow-hidden whitespace-nowrap text-xs">
                {/* Input token */}
                <div className="flex min-w-0 items-center gap-2">
                  <AssetLogo url={product?.inputTokens?.[0]?.logoURI} className="h-6 w-6" />
                  <span
                    className="max-w-[5rem] truncate text-xs text-white"
                    title={product?.inputTokens?.[0]?.symbol ?? undefined}
                  >
                    {product?.inputTokens?.[0]?.symbol}
                  </span>
                </div>
                {product?.outputToken && (
                  <>
                    <span className="text-white">/</span>
                    {/* Output token */}
                    <div className="flex min-w-0 items-center gap-2">
                      <AssetLogo url={product.outputToken.logoURI} className="h-6 w-6" />
                      <span
                        className="max-w-[5rem] truncate text-xs text-white"
                        title={product.outputToken.symbol}
                      >
                        {product.outputToken.symbol}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="text-body-secondary flex w-full items-center justify-between gap-4 text-[10px] font-normal">
          <div className="truncate">
            {accounts.length === 1 ? (
              <div className="text-body-secondary text-[10px]">{balance.type}</div>
            ) : (
              <PortfolioAccount address={balance.address} className="text-white" />
            )}
          </div>
          <div>
            <div className="text-body text-xs font-bold">
              <Fiat amount={Number(balance.amountUsd)} />
            </div>
          </div>
        </div>
      </div>
    </button>
  )
}

const PopupStakingTile = () => {
  const { t } = useTranslation()

  const handleStakingClick = () => {
    window.open(TALISMAN_WEB_APP_STAKING_URL, "_blank")
  }

  return (
    <button
      type="button"
      className="bg-grey-850 hover:bg-grey-800 mb-4 flex h-[5.2rem] w-full cursor-pointer items-center justify-between rounded px-6 text-left transition-colors"
      onClick={handleStakingClick}
    >
      <div className="flex items-center gap-4">
        <ZapIcon className="h-6 w-6 text-white" />
        <div className="flex flex-col">
          <div className="text-sm font-bold text-white">{t("Staking")}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-body-secondary text-xs">{t("Self-stake through Talisman portal")}</div>
        <ExternalLinkIcon className="text-body-secondary h-6 w-6" />
      </div>
    </button>
  )
}

// Loading skeleton for token rows
const PopupEarnAssetsSkeleton: FC = () => {
  return (
    <div className="flex w-full flex-col gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-grey-850 w-full rounded">
          <div className="flex w-full items-center gap-6 p-6">
            {/* Left: token logo placeholder */}
            <div className="bg-grey-700 h-12 w-12 shrink-0 animate-pulse rounded-full" />

            {/* Middle: token name and holdings */}
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="bg-grey-700 h-3 w-40 max-w-[50%] animate-pulse rounded" />
              <div className="bg-grey-700 h-2 w-24 max-w-[35%] animate-pulse rounded" />
            </div>

            {/* Right: amounts and chevron */}
            <div className="flex shrink-0 items-center gap-4">
              <div className="flex flex-col items-end gap-2">
                <div className="bg-grey-700 h-3 w-32 animate-pulse rounded" />
                <div className="bg-grey-700 h-4 w-24 animate-pulse rounded" />
              </div>
              <div className="bg-grey-700 h-8 w-8 animate-pulse rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Token row with accordion functionality like dashboard
const PopupEarnTokenRow: FC<{
  tokenData: GroupedTokenData
}> = ({ tokenData }) => {
  const { t } = useTranslation()
  const [isExpanded, setIsExpanded] = useState(false)

  const handleToggle = useCallback(() => {
    setIsExpanded(!isExpanded)
  }, [isExpanded])

  // Calculate total token amount from all positions
  const totalTokenAmount = useMemo(() => {
    return tokenData.positions.reduce(
      (total: number, { balance }: { balance: YieldPositionBalance }) => {
        return total + parseFloat(balance.amount)
      },
      0,
    )
  }, [tokenData.positions])

  return (
    <div className="bg-grey-850 flex w-full flex-col gap-3">
      {/* Token Row - matching DashboardAssetRow style */}
      <button
        type="button"
        onClick={handleToggle}
        className="text-body-secondary bg-grey-850 hover:bg-grey-800 flex w-full items-center gap-6 overflow-hidden rounded p-6 text-left text-sm"
      >
        {/* Left section - Logo and Token Info - Flexible */}
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="shrink-0 text-xl">
            <AssetLogo
              tokenId={undefined}
              url={tokenData.positions[0]?.balance.token.logoURI || null}
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="text-body flex min-w-0 items-center gap-2 text-sm font-bold">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="truncate" title={tokenData.tokenSymbol}>
                    {tokenData.tokenSymbol}
                  </div>
                </TooltipTrigger>
                <TooltipContent>{tokenData.tokenSymbol}</TooltipContent>
              </Tooltip>
              <NetworkLogo
                networkId={
                  mapYieldNetworkToNetworkId(tokenData.positions[0]?.product?.network) ||
                  tokenData.positions[0]?.balance.token.network
                }
                className="shrink-0 text-[1rem]"
              />
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-body-secondary truncate text-xs">
                  {tokenData.holdingsCount}{" "}
                  {tokenData.holdingsCount === 1 ? t("holding") : t("holdings")}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {tokenData.holdingsCount}{" "}
                {tokenData.holdingsCount === 1 ? t("holding") : t("holdings")}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Right section - Token/Fiat Amount and Expand Icon - Flexible */}
        <div className="flex min-w-0 flex-shrink-0 items-center gap-4">
          <div className="flex min-w-0 flex-col items-end gap-1">
            {/* Token Amount */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-body-secondary truncate text-right text-xs">
                  {totalTokenAmount.toLocaleString()} {tokenData.tokenSymbol}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {totalTokenAmount.toLocaleString()} {tokenData.tokenSymbol}
              </TooltipContent>
            </Tooltip>
            {/* Fiat Amount */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-body truncate text-right text-sm font-bold">
                  <Fiat amount={tokenData.totalAmountUsd} />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <Fiat amount={tokenData.totalAmountUsd} />
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex shrink-0 items-center">
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
        <div className="bg-grey-850 flex flex-col gap-4 pb-4 pl-6 pr-6">
          {tokenData.positions.map(({ balance, yieldId, product }) => (
            <PopupYieldPositionRow
              key={balance.address + yieldId}
              balance={balance}
              yieldId={yieldId}
              product={product}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export const PopupEarnAssetsTab: FC = () => {
  const { t } = useTranslation()
  const { yieldPositions, isLoading } = useYieldBalances()

  // Group positions by token symbol for display - matching dashboard logic
  const groupedPositions = useMemo(() => {
    if (!yieldPositions) return []

    const grouped = new Map<string, GroupedTokenData>()

    yieldPositions.forEach((position) => {
      position.balances.forEach((balance) => {
        const symbol = balance.token.symbol
        if (!grouped.has(symbol)) {
          grouped.set(symbol, {
            tokenSymbol: symbol,
            totalAmountUsd: 0,
            positions: [],
            holdingsCount: 0,
          })
        }

        const group = grouped.get(symbol)!
        group.positions.push({
          balance,
          yieldId: position.yieldId,
          product: position.product,
          amountUsd: Number(balance.amountUsd),
        })
        group.totalAmountUsd += Number(balance.amountUsd)
        group.holdingsCount += 1
      })
    })

    return Array.from(grouped.values()).sort((a, b) => b.totalAmountUsd - a.totalAmountUsd)
  }, [yieldPositions])

  if (isLoading) {
    return <PopupEarnAssetsSkeleton />
  }

  if (!groupedPositions.length) {
    return (
      <div className="text-body-secondary bg-black-secondary rounded-sm py-10 text-center text-xs">
        {t("No earning positions found.")}
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {/* Staking Section */}
      <div className="mb-4">
        <h2 className="text-body-secondary mb-4 text-sm font-medium">{t("Staking")}</h2>
        <PopupStakingTile />
      </div>

      {/* Yield Positions Section */}
      {groupedPositions.length > 0 && (
        <div className="mb-6">
          <h2 className="text-body-secondary mb-4 text-sm font-medium">{t("Yield Positions")}</h2>
          <div className="flex w-full flex-col gap-4">
            {groupedPositions.map((tokenData) => (
              <PopupEarnTokenRow key={tokenData.tokenSymbol} tokenData={tokenData} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
