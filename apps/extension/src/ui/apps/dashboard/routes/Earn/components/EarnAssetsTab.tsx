import { ChevronDownIcon, ChevronRightIcon, ExternalLinkIcon, ZapIcon } from "@talismn/icons"
import { classNames, LoadableStatus } from "@talismn/util"
import { YieldPositionBalance, YieldProduct } from "extension-core"
import { TALISMAN_WEB_APP_STAKING_URL } from "extension-shared"
import { FC, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useLocation, useNavigate } from "react-router-dom"

import { AssetLogo } from "@ui/domains/Asset/AssetLogo"
import { Fiat } from "@ui/domains/Asset/Fiat"
// import { DefiPositionRow } from "@ui/domains/Portfolio/DeFi/PopupDefiPositions"

import { useYieldBalances } from "@ui/domains/Earn/hooks/useYieldBalances"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { AssetBalanceCellValue } from "@ui/domains/Portfolio/AssetBalanceCellValue"
import { PortfolioAccount } from "@ui/domains/Portfolio/AssetDetails/PortfolioAccount"
import { usePortfolioNavigation } from "@ui/domains/Portfolio/usePortfolioNavigation"
import { useAccounts, usePortfolioGlobalData, usePortfolioSelectedAccounts } from "@ui/state"
import { useYieldSearch } from "@ui/state/yield"

// import { SearchInput } from "@talisman/components/SearchInput"
// import { setPortfolioSearch, usePortfolioSearch } from "@ui/state"

// import { DefiAssetRow } from "./DefiAssetRow"

const mapYieldNetworkToNetworkId = (yieldNetwork?: string): string | undefined => {
  switch (yieldNetwork) {
    case "ethereum":
      return "1"
    case "base":
      return "8453"
    default:
      return undefined
  }
}

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

// YieldPositionRow for yield balances
const YieldPositionRow: FC<{
  balance: YieldPositionBalance
  yieldId: string
  product?: YieldProduct
  status: LoadableStatus
  noCountUp: boolean
}> = ({ balance, yieldId, product, status, noCountUp: _noCountUp }) => {
  const selectedAccounts = usePortfolioSelectedAccounts()
  const navigate = useNavigate()
  const validator = (balance as unknown as { validator?: { name?: string; logoURI?: string } })
    ?.validator

  return (
    <button
      type="button"
      className={classNames(
        "bg-grey-850 hover:bg-grey-800 flex h-auto w-full items-center gap-4 overflow-hidden rounded-sm p-6",
      )}
      onClick={() => navigate(`/portfolio/yield/${yieldId}`)}
    >
      <AssetLogo
        url={validator?.logoURI || product?.metadata.logoURI || balance.token.logoURI}
        className="size-16"
      />
      <div className="flex w-full grow flex-col gap-4 overflow-hidden">
        <div className="flex w-full items-center justify-between gap-6 overflow-hidden text-sm font-bold">
          <div className="flex max-w-full items-center gap-3 overflow-hidden">
            <div
              className="truncate text-white"
              title={(validator?.name || product?.metadata.name) ?? undefined}
            >
              {validator?.name || product?.metadata.name}
            </div>
            <NetworkLogo
              networkId={mapYieldNetworkToNetworkId(product?.network) || balance.token.network}
              className="inline-block"
            />
            <div className="text-body-secondary border-grey-500 rounded-xs border-[0.2rem] px-2 py-1 text-[0.8rem]">
              {(product?.mechanics.type || "").toLocaleUpperCase()}
            </div>
          </div>
          <div className="w-[20rem] shrink-0">
            <div className="flex w-full flex-col items-end gap-1 overflow-hidden">
              <div className="text-body-secondary flex items-center gap-2 overflow-hidden whitespace-nowrap text-sm">
                {/* Input token */}
                <div className="flex min-w-0 items-center gap-2">
                  <AssetLogo url={product?.inputTokens?.[0]?.logoURI} className="h-8 w-8" />
                  <span
                    className="max-w-[7rem] truncate text-sm text-white"
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
                      <AssetLogo url={product.outputToken.logoURI} className="h-8 w-8" />
                      <span
                        className="max-w-[7rem] truncate text-sm text-white"
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
        <div className="text-body-secondary flex w-full items-center justify-between gap-6 text-xs font-normal">
          <div className="truncate">
            {selectedAccounts?.length === 1 ? (
              <div className="text-body-secondary text-xs">{balance.type}</div>
            ) : (
              <PortfolioAccount address={balance.address} className="text-white" />
            )}
          </div>
          <div className={classNames(status === "loading" && "animate-pulse")}>
            <div className="text-body text-sm font-bold">
              <Fiat amount={parseFloat(balance.amountUsd) || 0} noCountUp forceCurrency="usd" />
            </div>
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
        className={classNames(
          "text-body-secondary bg-grey-850 hover:bg-grey-800 flex w-full items-center justify-between overflow-hidden rounded p-8 text-left text-base",
        )}
      >
        {/* Left section - Logo and Token Info */}
        <div className="flex items-center gap-4">
          <div className="shrink-0 text-xl">
            <AssetLogo
              tokenId={undefined}
              url={tokenData.positions[0]?.balance.token.logoURI || null}
            />
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-body flex items-center gap-2 text-base font-bold">
              {tokenData.tokenSymbol}
              <NetworkLogo
                networkId={
                  mapYieldNetworkToNetworkId(tokenData.positions[0]?.product?.network) ||
                  tokenData.positions[0]?.balance.token.network
                }
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
            forceFiatCurrency="usd"
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
          {tokenData.positions.map(({ balance, yieldId, product }) => (
            <YieldPositionRow
              key={balance.address + yieldId}
              balance={balance}
              yieldId={yieldId}
              product={product}
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
        <ZapIcon className="h-8 w-8 text-white" />
        <div className="flex flex-col">
          <div className="text-base font-bold !text-white">{t("Staking")}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-body-secondary text-sm">{t("Self-stake through Talisman portal")}</div>
        <ExternalLinkIcon className="text-body-secondary h-8 w-8" />
      </div>
    </button>
  )
}

export const EarnAssetsTab = () => {
  const { t } = useTranslation()
  const { isInitialising } = usePortfolioGlobalData()
  const { selectedAccount, selectedFolder } = usePortfolioNavigation()
  const { groupedByToken, isLoading: isYieldLoading } = useYieldBalances()
  const accounts = useAccounts("owned")
  const search = useYieldSearch()

  const location = useLocation()

  // Get owned account addresses to filter out watched accounts
  const ownedAddresses = useMemo(() => {
    return new Set(accounts.map((account) => account.address))
  }, [accounts])

  // Convert yield balances groupedByToken to our GroupedTokenData format
  const convertedGroupedByToken = useMemo(() => {
    if (!groupedByToken || groupedByToken.size === 0) return new Map<string, GroupedTokenData>()

    const converted = new Map<string, GroupedTokenData>()
    const lowerSearch = (search || "").toLowerCase().trim()

    groupedByToken.forEach((tokenGroup, tokenSymbol) => {
      // Filter positions by owned accounts
      const ownedPositions = tokenGroup.positions.filter(
        ({ balance }: { balance: YieldPositionBalance }) => ownedAddresses.has(balance.address),
      )

      // Apply search filtering across token symbol, product name, input/output token symbols
      const searchedPositions = ownedPositions.filter(
        ({ balance, product }: { balance: YieldPositionBalance; product?: YieldProduct }) => {
          if (!lowerSearch) return true
          const haystack: string[] = [
            balance.token.symbol,
            product?.metadata?.name,
            product?.inputTokens?.[0]?.symbol,
            product?.outputToken?.symbol,
          ]
            .filter(Boolean)
            .map((v) => String(v).toLowerCase())
          return haystack.some((text) => text.includes(lowerSearch))
        },
      )

      if (searchedPositions.length > 0) {
        const totalAmountUsd = searchedPositions.reduce(
          (sum: number, { balance }: { balance: YieldPositionBalance }) =>
            sum + parseFloat(balance.amountUsd),
          0,
        )

        converted.set(tokenSymbol, {
          tokenSymbol,
          totalAmountUsd,
          positions: searchedPositions.map(
            ({
              balance,
              yieldId,
              product,
            }: {
              balance: YieldPositionBalance
              yieldId: string
              product?: YieldProduct
            }) => ({
              balance,
              yieldId,
              amountUsd: parseFloat(balance.amountUsd),
              product,
            }),
          ),
          holdingsCount: searchedPositions.length,
        })
      }
    })

    return converted
  }, [groupedByToken, ownedAddresses, search])

  // Show grouped assets instead of individual positions
  const hasDefiAssets = convertedGroupedByToken.size > 0

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
            {Array.from(convertedGroupedByToken.entries()).map(([tokenSymbol, tokenData]) => (
              <DefiTokenRow key={tokenSymbol + tokenData.totalAmountUsd} tokenData={tokenData} />
            ))}
          </div>
        </div>
      )}
      {(isInitialising || isYieldLoading) && <EarnTokenRowSkeleton />}
    </div>
  )
}
