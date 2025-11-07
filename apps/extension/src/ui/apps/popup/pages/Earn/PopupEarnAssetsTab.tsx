import { isAddressEqual } from "@talismn/crypto"
import { ChevronDownIcon, ChevronRightIcon, ExternalLinkIcon, ZapIcon } from "@talismn/icons"
import { BalanceDto, YieldPosition } from "extension-core"
import { TALISMAN_WEB_APP_STAKING_URL } from "extension-shared"
import { FC, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { AssetLogo } from "@ui/domains/Asset/AssetLogo"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { useYieldBalancesGrouped } from "@ui/domains/Earn/hooks/useYieldBalancesGrouped"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { PortfolioAccount } from "@ui/domains/Portfolio/AssetDetails/PortfolioAccount"
import { usePortfolioAccounts } from "@ui/hooks/usePortfolioAccounts"
import { useYieldSearch } from "@ui/state/yield"

interface GroupedTokenData {
  tokenSymbol: string
  totalAmountUsd: number
  positions: Array<{
    position: YieldPosition
    tokenBalance: BalanceDto
  }>
  holdingsCount: number
}

// YieldPositionRow for yield balances - clickable like dashboard
const PopupYieldPositionRow: FC<{
  position: YieldPosition
  tokenBalance: BalanceDto
}> = ({ position, tokenBalance }) => {
  const navigate = useNavigate()

  const handleClick = useCallback(() => {
    // Get account address from the first balance (all balances in a position have the same account)
    const accountAddress =
      (tokenBalance as unknown as { address?: string }).address ||
      (position.balances[0] as unknown as { address?: string })?.address
    const validatorAddress = position.validatorAddress

    // Build URL with query params
    const params = new URLSearchParams()
    if (accountAddress) params.set("account", accountAddress)
    if (validatorAddress) params.set("validator", validatorAddress)

    const queryString = params.toString()
    navigate(`/earn/yield/${position.yieldId}${queryString ? `?${queryString}` : ""}`)
  }, [navigate, position.yieldId, position.validatorAddress, position.balances, tokenBalance])

  return (
    <button
      type="button"
      className="bg-grey-850 hover:bg-grey-800 flex h-auto w-full items-center gap-3 overflow-hidden rounded-sm p-4"
      onClick={handleClick}
    >
      <AssetLogo
        url={
          (tokenBalance as unknown as { validator?: { logoURI?: string } })?.validator?.logoURI ||
          position.product?.metadata.logoURI ||
          tokenBalance.token.logoURI
        }
        className="size-12"
      />
      <div className="flex w-full grow flex-col gap-2 overflow-hidden">
        <div className="flex w-full items-center justify-between gap-4 overflow-hidden text-xs font-bold">
          <div className="flex max-w-full items-center gap-3 overflow-hidden">
            <div className="truncate text-white" title={position.displayName}>
              {position.displayName}
            </div>
            <NetworkLogo networkId={position.networkId} className="inline-block" />
            {position.balances.some((b) => b.type === "claimable") && (
              <div className="text-[10px] font-medium text-green-400">+rewards</div>
            )}
          </div>
          <div className="w-[16rem] shrink-0">
            <div className="flex w-full flex-col items-end gap-1 overflow-hidden">
              <div className="text-body-secondary flex items-center gap-2 overflow-hidden whitespace-nowrap text-xs">
                {/* Input token */}
                <div className="flex min-w-0 items-center gap-2">
                  <AssetLogo
                    url={position.product?.inputTokens?.[0]?.logoURI}
                    className="h-6 w-6"
                  />
                  <span
                    className="max-w-[5rem] truncate text-xs text-white"
                    title={position.product?.inputTokens?.[0]?.symbol ?? undefined}
                  >
                    {position.product?.inputTokens?.[0]?.symbol}
                  </span>
                </div>
                {position.product?.outputToken && (
                  <>
                    <span className="text-white">/</span>
                    {/* Output token */}
                    <div className="flex min-w-0 items-center gap-2">
                      <AssetLogo url={position.product.outputToken.logoURI} className="h-6 w-6" />
                      <span
                        className="max-w-[5rem] truncate text-xs text-white"
                        title={position.product.outputToken.symbol}
                      >
                        {position.product.outputToken.symbol}
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
            <PortfolioAccount address={tokenBalance.address} className="text-white" />
          </div>
          <div>
            <div className="text-body text-xs font-bold">
              <Tokens
                amount={parseFloat(tokenBalance.amount)}
                decimals={tokenBalance.token.decimals}
                symbol={tokenBalance.token.symbol}
                noCountUp
              />
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
    return tokenData.positions.reduce((total: number, { tokenBalance }) => {
      return total + parseFloat(tokenBalance.amount || "0")
    }, 0)
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
              url={tokenData.positions[0]?.tokenBalance.token.logoURI || null}
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
                networkId={tokenData.positions[0]?.position.networkId}
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
                  <Fiat amount={tokenData.totalAmountUsd} forceCurrency="usd" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <Fiat amount={tokenData.totalAmountUsd} forceCurrency="usd" />
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
          {tokenData.positions.map(({ position, tokenBalance }) => (
            <PopupYieldPositionRow
              key={`${position.yieldId}-${tokenBalance.token.symbol}`}
              position={position}
              tokenBalance={tokenBalance}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export const PopupEarnAssetsTab: FC = () => {
  const { t } = useTranslation()
  const yieldBalancesGrouped = useYieldBalancesGrouped()
  const search = useYieldSearch()
  const [searchParams] = useSearchParams()
  const { accounts: allAccounts, portfolioAccounts, catalog } = usePortfolioAccounts()
  const [isDefiExpanded, setIsDefiExpanded] = useState(true)

  // Get selected accounts from URL params, similar to usePortfolioNavigation
  const selectedAccounts = useMemo(() => {
    const accountAddress = searchParams.get("account")
    const folderId = searchParams.get("folder")

    if (accountAddress) {
      const selectedAccount = allAccounts.find((acc) => isAddressEqual(acc.address, accountAddress))
      return selectedAccount ? [selectedAccount] : portfolioAccounts
    }

    if (folderId) {
      const selectedFolder =
        catalog.portfolio.find((folder) => folder.type === "folder" && folder.id === folderId) ||
        catalog.watched.find((folder) => folder.type === "folder" && folder.id === folderId)
      if (selectedFolder && selectedFolder.type === "folder") {
        return allAccounts.filter((acc) =>
          selectedFolder.tree.some((treeAcc) => isAddressEqual(acc.address, treeAcc.address)),
        )
      }
    }

    return portfolioAccounts
  }, [allAccounts, portfolioAccounts, catalog, searchParams])

  // Use grouped positions directly from extension-core
  const groupedPositions = useMemo(() => {
    if (yieldBalancesGrouped.status !== "success" || !yieldBalancesGrouped.data) return []

    const lowerSearch = (search || "").toLowerCase().trim()
    const selectedAddresses = new Set((selectedAccounts || []).map((a) => a.address))

    const filtered = yieldBalancesGrouped.data
      // Filter by selected accounts
      .filter((position) => {
        // Check if any balance in the position belongs to selected addresses
        const hasSelectedAddress = selectedAddresses.size
          ? position.balances.some((balance) => selectedAddresses.has(balance.address))
          : true
        return hasSelectedAddress
      })
      // Filter by search
      .filter((position) => {
        if (!lowerSearch) return true
        const haystack: string[] = [
          position.displayName,
          position.product?.inputTokens?.[0]?.symbol,
          position.product?.outputToken?.symbol,
          ...position.balances.map((b) => b.token.symbol),
        ]
          .filter(Boolean)
          .map((v) => String(v).toLowerCase())

        return haystack.some((text) => text.includes(lowerSearch))
      })

    // Group by token symbol - map only non-claimable tokens to positions
    const grouped = filtered.reduce(
      (acc: Record<string, GroupedTokenData>, position) => {
        // Group non-claimable balances by token symbol for this position
        const tokenBalances = new Map<string, BalanceDto[]>()

        position.balances.forEach((balance) => {
          if (balance.type !== "claimable") {
            const symbol = balance.token.symbol
            if (!tokenBalances.has(symbol)) {
              tokenBalances.set(symbol, [])
            }
            tokenBalances.get(symbol)!.push(balance)
          }
        })

        // Create one entry per token symbol for this position
        tokenBalances.forEach((balances, symbol) => {
          if (!acc[symbol]) {
            acc[symbol] = {
              tokenSymbol: symbol,
              totalAmountUsd: 0,
              positions: [],
              holdingsCount: 0,
            }
          }

          // Sum all balances for this token in this position
          const totalAmountUsd = balances.reduce(
            (sum, b) => sum + parseFloat(b.amountUsd || "0"),
            0,
          )
          const totalAmount = balances.reduce((sum, b) => sum + parseFloat(b.amount || "0"), 0)

          // Create a combined balance for display
          const combinedBalance: BalanceDto = {
            ...balances[0], // Use first balance as base
            amount: totalAmount.toString(),
            amountUsd: totalAmountUsd.toString(),
            amountRaw: balances
              .reduce((sum, b) => sum + parseFloat(b.amountRaw || "0"), 0)
              .toString(),
          }

          acc[symbol].positions.push({
            position,
            tokenBalance: combinedBalance,
          })
          acc[symbol].totalAmountUsd += totalAmountUsd
          acc[symbol].holdingsCount += 1
        })

        return acc
      },
      {} as Record<string, GroupedTokenData>,
    )

    // Convert to array and sort
    return Object.values(grouped).sort(
      (a: GroupedTokenData, b: GroupedTokenData) => b.totalAmountUsd - a.totalAmountUsd,
    )
  }, [yieldBalancesGrouped, search, selectedAccounts])

  // Calculate total fiat value from all Defi positions
  const totalDefiAmountUsd = useMemo(() => {
    if (!groupedPositions.length) return 0
    return groupedPositions.reduce((total, tokenData) => total + tokenData.totalAmountUsd, 0)
  }, [groupedPositions])

  if (yieldBalancesGrouped.status === "loading") {
    return <PopupEarnAssetsSkeleton />
  }

  // Debug information
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

      {/* DeFi Positions Section */}
      {groupedPositions.length > 0 && (
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setIsDefiExpanded(!isDefiExpanded)}
            className="text-body-secondary hover:text-body mb-4 flex w-full items-center justify-between pr-6 text-sm font-medium"
          >
            <h2 className="text-body-secondary text-sm font-medium">{t("DeFi Positions")}</h2>
            <div className="flex items-center gap-2">
              <div className="text-body-secondary text-base font-bold">
                <Fiat amount={totalDefiAmountUsd} forceCurrency="usd" />
              </div>
              {isDefiExpanded ? (
                <ChevronDownIcon className="text-body-secondary h-8 w-8" />
              ) : (
                <ChevronRightIcon className="text-body-secondary h-8 w-8" />
              )}
            </div>
          </button>
          {isDefiExpanded && (
            <div className="flex w-full flex-col gap-4">
              {groupedPositions.map((tokenData) => (
                <PopupEarnTokenRow key={tokenData.tokenSymbol} tokenData={tokenData} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
