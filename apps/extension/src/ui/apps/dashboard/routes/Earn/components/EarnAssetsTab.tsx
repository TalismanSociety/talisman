import { isAddressEqual } from "@talismn/crypto"
import { ChevronDownIcon, ChevronRightIcon, ExternalLinkIcon, ZapIcon } from "@talismn/icons"
import { classNames, LoadableStatus } from "@talismn/util"
import { BalanceDto, YieldxyzPosition } from "extension-core"
import { TALISMAN_WEB_APP_STAKING_URL } from "extension-shared"
import { FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useLocation, useNavigate, useSearchParams } from "react-router-dom"

import { AssetLogo } from "@ui/domains/Asset/AssetLogo"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { useEarnAssetsState } from "@ui/domains/Earn/context/EarnAssetsStateContext"
import { useYieldBalancesGrouped } from "@ui/domains/Earn/hooks/useYieldBalancesGrouped"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { AssetBalanceCellValue } from "@ui/domains/Portfolio/AssetBalanceCellValue"
import { PortfolioAccount } from "@ui/domains/Portfolio/AssetDetails/PortfolioAccount"
import { usePortfolioNavigation } from "@ui/domains/Portfolio/usePortfolioNavigation"
import { usePortfolioGlobalData } from "@ui/state"
import { useTalismanNetworkIdFromYieldNetworkId } from "@ui/state/yield"

interface GroupedTokenData {
  tokenSymbol: string
  totalAmountUsd: number
  positions: Array<{
    position: YieldxyzPosition
    tokenBalance: BalanceDto
  }>
  holdingsCount: number
}

// YieldPositionRow for yield balances
const YieldPositionRow: FC<{
  position: YieldxyzPosition
  tokenBalance: BalanceDto
  status: LoadableStatus
  noCountUp: boolean
}> = ({ position, tokenBalance, status, noCountUp: _noCountUp }) => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const networkId = useTalismanNetworkIdFromYieldNetworkId(position.product?.network)

  const validator = (tokenBalance as unknown as { validator?: { name?: string; logoURI?: string } })
    ?.validator

  return (
    <button
      type="button"
      className={classNames(
        "bg-grey-850 hover:bg-grey-800 flex h-auto w-full items-center gap-4 overflow-hidden rounded-sm p-6",
      )}
      onClick={() => {
        // Get validator address for the position
        const validatorAddress = position.validatorAddress

        // Preserve current account/folder from URL to prevent sidebar from resetting
        // (yield position page will ignore account param and not filter by it)
        const params = new URLSearchParams(searchParams)
        // Remove account and folder from params, then add them back if they exist
        const currentAccount = searchParams.get("account")
        const currentFolder = searchParams.get("folder")
        params.delete("account")
        params.delete("folder")
        if (validatorAddress) params.set("validator", validatorAddress)
        // Preserve account/folder for sidebar (yield position will ignore it)
        if (currentAccount) params.set("account", currentAccount)
        if (currentFolder) params.set("folder", currentFolder)

        const queryString = params.toString()
        navigate(`/earn/yield/${position.yieldId}${queryString ? `?${queryString}` : ""}`)
      }}
    >
      <AssetLogo
        url={validator?.logoURI || position.product?.metadata.logoURI || tokenBalance.token.logoURI}
        className="size-16"
      />
      <div className="flex w-full grow flex-col gap-4 overflow-hidden">
        <div className="flex w-full items-center justify-between gap-6 overflow-hidden text-sm font-[650]">
          <div className="flex max-w-full items-center gap-3 overflow-hidden">
            <div className="truncate text-white" title={position.displayName}>
              {position.displayName}
            </div>
            <NetworkLogo networkId={networkId} className="inline-block text-base" />
            <div className="text-body-secondary border-grey-500 rounded-xs border px-2 py-1 text-[0.8rem]">
              {(position.product?.mechanics.type || "").toLocaleUpperCase()}
            </div>
          </div>
          <div className="w-[20rem] shrink-0">
            <div className="flex w-full flex-col items-end gap-1 overflow-hidden">
              <div className="text-body-secondary flex items-center gap-2 overflow-hidden whitespace-nowrap text-sm">
                {/* Input token */}
                <div className="flex min-w-0 items-center gap-2">
                  <AssetLogo
                    url={position.product?.inputTokens?.[0]?.logoURI}
                    className="h-8 w-8"
                  />
                  <span
                    className="max-w-[7rem] truncate text-sm text-white"
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
                      <AssetLogo url={position.product.outputToken.logoURI} className="h-8 w-8" />
                      <span
                        className="max-w-[7rem] truncate text-sm text-white"
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
        <div className="text-body-secondary flex w-full items-center justify-between gap-6 text-xs font-normal">
          <div className="h-6 truncate">
            <PortfolioAccount
              address={tokenBalance.address}
              className="h-6 text-white"
              textClassName="text-[1.2rem]"
            />
          </div>
          <div className={classNames(status === "loading" && "animate-pulse")}>
            <div className="text-body text-sm font-bold">
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

const DefiTokenRow: FC<{
  tokenData: GroupedTokenData
  isExpanded: boolean
  onToggle: (tokenSymbol: string) => void
}> = ({ tokenData, isExpanded, onToggle }) => {
  const { t } = useTranslation()

  const networkId = useTalismanNetworkIdFromYieldNetworkId(
    tokenData.positions[0]?.position.product?.network,
  )

  const handleToggle = useCallback(() => {
    onToggle(tokenData.tokenSymbol)
  }, [onToggle, tokenData.tokenSymbol])

  // Calculate total token amount from all positions
  const totalTokenAmount = useMemo(() => {
    return tokenData.positions.reduce((total: number, { tokenBalance }) => {
      return total + parseFloat(tokenBalance.amount || "0")
    }, 0)
  }, [tokenData.positions])

  return (
    <div className="bg-grey-850 flex w-full flex-col gap-3 rounded">
      {/* Token Row - matching DashboardAssetRow style */}
      <button
        type="button"
        onClick={handleToggle}
        className={classNames(
          "text-body-secondary bg-grey-850 hover:bg-grey-800 flex w-full items-center justify-between overflow-hidden py-8 pl-8 pr-10 text-left text-base",
          isExpanded ? "rounded-t" : "rounded",
        )}
      >
        {/* Left section - Logo and Token Info */}
        <div className="flex items-center gap-4">
          <div className="shrink-0 text-xl">
            <AssetLogo
              tokenId={undefined}
              url={tokenData.positions[0]?.tokenBalance.token.logoURI || null}
            />
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-body flex items-center gap-3 text-sm font-[650]">
              {tokenData.tokenSymbol}
              <NetworkLogo networkId={networkId} className="text-base" />
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
          {isExpanded ? (
            <ChevronDownIcon className="text-body-secondary h-8 w-8" />
          ) : (
            <ChevronRightIcon className="text-body-secondary h-8 w-8" />
          )}
        </div>
      </button>

      {/* Expanded Positions - part of same row background */}
      {isExpanded && (
        <div className="bg-grey-850 flex flex-col gap-4 rounded-b pb-4 pl-8 pr-8">
          {tokenData.positions.map(({ position, tokenBalance }, idx) => (
            <YieldPositionRow
              key={`${position.yieldId}-${tokenBalance.token.symbol}-${idx}`}
              position={position}
              tokenBalance={tokenBalance}
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
        "text-body-secondary bg-grey-850 mb-4 grid w-full grid-cols-[40%_30%_30%] rounded text-left text-base",
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
      className="bg-grey-850 hover:bg-grey-800 mb-4 flex h-[6.6rem] w-full cursor-pointer items-center justify-between rounded pl-8 pr-10 text-left transition-colors"
      onClick={handleStakingClick}
    >
      <div className="flex items-center gap-6">
        <ZapIcon className="h-8 w-8 text-white" />
        <div className="flex flex-col">
          <div className="text-base font-bold !text-white">{t("Staking")}</div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-body-secondary text-sm">{t("Self-stake through Talisman portal")}</div>
        <ExternalLinkIcon className="text-body-secondary h-8 w-8" />
      </div>
    </button>
  )
}

export const EarnAssetsTab: FC<{ search: string }> = ({ search }) => {
  const { t } = useTranslation()
  const { isInitialising } = usePortfolioGlobalData()
  const { selectedAccount, selectedFolder, selectedAccounts } = usePortfolioNavigation()
  const yieldBalancesGrouped = useYieldBalancesGrouped()
  const isLoading = yieldBalancesGrouped.status === "loading"

  // Get expanded state from context
  const { isDefiExpanded, expandedTokens, toggleDefiExpanded, toggleTokenExpanded } =
    useEarnAssetsState()

  // Toggle handlers
  const handleDefiToggle = useCallback(() => {
    toggleDefiExpanded()
  }, [toggleDefiExpanded])

  const handleTokenToggle = useCallback(
    (tokenSymbol: string) => {
      toggleTokenExpanded(tokenSymbol)
    },
    [toggleTokenExpanded],
  )

  const location = useLocation()

  // Convert yield balances to token-to-position mapping
  const convertedGroupedByToken = useMemo(() => {
    if (!yieldBalancesGrouped.data) return new Map<string, GroupedTokenData>()

    const converted = new Map<string, GroupedTokenData>()
    const lowerSearch = (search || "").toLowerCase().trim()

    yieldBalancesGrouped.data
      .filter((position) =>
        selectedAccounts.some((sa) =>
          position.balances.some((pb) => isAddressEqual(sa.address, pb.address)),
        ),
      )
      .filter((position) => {
        // TODO move search in another useMemo
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
      .forEach((position) => {
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
          if (!converted.has(symbol)) {
            converted.set(symbol, {
              tokenSymbol: symbol,
              totalAmountUsd: 0,
              positions: [],
              holdingsCount: 0,
            })
          }

          const group = converted.get(symbol)!

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

          group.positions.push({
            position,
            tokenBalance: combinedBalance,
          })
          group.totalAmountUsd += totalAmountUsd
          group.holdingsCount += 1
        })
      })

    return converted
  }, [yieldBalancesGrouped, search, selectedAccounts])

  // Show grouped assets instead of individual positions
  const hasDefiAssets = convertedGroupedByToken.size > 0

  // Calculate total fiat value from all Defi positions
  const totalDefiAmountUsd = useMemo(() => {
    if (!hasDefiAssets) return 0
    return Array.from(convertedGroupedByToken.values()).reduce(
      (total, tokenData) => total + tokenData.totalAmountUsd,
      0,
    )
  }, [convertedGroupedByToken, hasDefiAssets])

  if (!hasDefiAssets && !isInitialising && !isLoading) {
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
          <button
            type="button"
            onClick={handleDefiToggle}
            className="text-body-secondary hover:text-body mb-4 flex w-full items-center justify-between pr-2 text-sm font-medium"
          >
            <h2 className="text-body-secondary text-sm font-medium">{t("DeFi Positions")}</h2>
            <div className="flex items-center gap-2">
              <div className="text-body-secondary text-base font-normal">
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
            <div className="flex flex-col gap-4">
              {Array.from(convertedGroupedByToken.entries()).map(([tokenSymbol, tokenData], i) => (
                <DefiTokenRow
                  key={`${tokenSymbol}-${i}`}
                  tokenData={tokenData}
                  isExpanded={expandedTokens.has(tokenSymbol)}
                  onToggle={handleTokenToggle}
                />
              ))}
              {(isInitialising || isLoading) && <EarnTokenRowSkeleton />}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
