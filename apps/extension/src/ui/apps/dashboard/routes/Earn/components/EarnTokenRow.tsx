import { Balances } from "@talismn/balances"
import { ChevronDownIcon, ChevronUpIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { Networks } from "extension-core"
import { FC, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { AssetPrice } from "@ui/domains/Asset/AssetPrice"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { ProductList } from "@ui/domains/Earn/components/ProductList"
import { getTokenAddress } from "@ui/domains/Earn/utils/tokenUtils"
import { AssetBalanceCellValue } from "@ui/domains/Portfolio/AssetBalanceCellValue"
import { PortfolioNetworksLogoStack } from "@ui/domains/Portfolio/AssetsTable/PortfolioNetworksLogoStack"
import { usePortfolioNetworkIds } from "@ui/domains/Portfolio/AssetsTable/usePortfolioNetworkIds"
import { useTokenBalancesSummary } from "@ui/domains/Portfolio/useTokenBalancesSummary"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useBalancesStatus } from "@ui/hooks/useBalancesStatus"
import { useUniswapV2LpTokenTotalValueLocked } from "@ui/hooks/useUniswapV2LpTokenTotalValueLocked"
import { useNetworkById } from "@ui/state"
import { useYieldProducts } from "@ui/state/yield"

export const EarnTokenRow: FC<{
  balances: Balances
  noCountUp?: boolean
}> = ({ balances, noCountUp }) => {
  const { t } = useTranslation()
  const networkIds = usePortfolioNetworkIds(balances)
  const { genericEvent } = useAnalytics()
  const [isExpanded, setIsExpanded] = useState(false)

  const status = useBalancesStatus(balances)
  const { token, rate, summary } = useTokenBalancesSummary(balances)
  const network = useNetworkById(token?.networkId)

  const isUniswapV2LpToken = token?.type === "evm-uniswapv2"
  const tvl = useUniswapV2LpTokenTotalValueLocked(token, rate?.price, balances)

  // Get token address if available, fallback to symbol
  const tokenIdentifier = useMemo(() => {
    const address = getTokenAddress(token)
    return address || token?.symbol || ""
  }, [token])

  // Fetch yield products for this token
  const {
    data: yieldProducts = [],
    isLoading: isLoadingProducts,
    error: productsError,
  } = useYieldProducts({
    inputTokens: tokenIdentifier,
    network: network?.platform as Networks,
  })

  const handleToggleExpand = useCallback(() => {
    setIsExpanded(!isExpanded)
    if (token) {
      genericEvent("toggle earn token expansion", {
        symbol: token.symbol,
        expanded: !isExpanded,
      })
    }
  }, [isExpanded, token, genericEvent])

  if (!token || !network || !summary) return null

  return (
    <div className="mb-4">
      {/* Token Row */}
      <div className="group relative h-[6.6rem] w-full">
        <button
          type="button"
          onClick={handleToggleExpand}
          className={classNames(
            "text-body-secondary bg-grey-850 hover:bg-grey-800 grid h-[6.6rem] w-full cursor-pointer grid-cols-[40%_30%_30%] overflow-hidden rounded text-left text-base",
          )}
        >
          {/* Token Info Column */}
          <div className="flex h-full">
            <div className="shrink-0 p-8 text-xl">
              <TokenLogo tokenId={token.id} />
            </div>
            <div className="flex grow flex-col justify-center gap-2">
              <div className="flex items-center gap-3">
                <div className="text-body flex items-center gap-4 text-base font-bold">
                  {token.symbol}
                  {/* Show indicator if earning opportunities are available */}
                  {!isLoadingProducts && yieldProducts.length > 0 && (
                    <span className="bg-primary/20 text-primary rounded-full px-2 py-1 text-xs font-normal">
                      {yieldProducts.length}{" "}
                      {yieldProducts.length === 1 ? "opportunity" : "opportunities"}
                    </span>
                  )}
                  {!!network.isTestnet && (
                    <span className="text-tiny bg-alert-warn/10 text-alert-warn rounded px-3 py-1 font-light">
                      {t("Testnet")}
                    </span>
                  )}
                </div>
                {!!networkIds.length && (
                  <div>
                    <PortfolioNetworksLogoStack networkIds={networkIds} max={3} />
                  </div>
                )}
              </div>
              {isUniswapV2LpToken && typeof tvl === "number" && (
                <div className="text-body-secondary whitespace-nowrap">
                  <Fiat amount={tvl} noCountUp={noCountUp} /> <span className="text-tiny">TVL</span>
                </div>
              )}
              {!isUniswapV2LpToken && !!rate && (
                <AssetPrice tokenId={token.id} className="text-body-secondary" />
              )}
            </div>
          </div>

          {/* Locked Balance Column */}
          <div className="h-[6.6rem] text-right">
            <AssetBalanceCellValue
              locked
              render={summary.lockedTokens.gt(0)}
              tokens={summary.lockedTokens}
              fiat={summary.lockedFiat}
              symbol={isUniswapV2LpToken ? "" : token.symbol}
              balancesStatus={status}
              className={classNames(
                "noPadRight",
                status.status === "fetching" && "animate-pulse transition-opacity",
              )}
              noCountUp={noCountUp}
            />
          </div>

          {/* Available Balance + Expand Button Column */}
          <div className="flex h-[6.6rem] items-center justify-end gap-4 pr-4">
            <div className="flex flex-col items-end justify-center gap-2 text-right">
              <AssetBalanceCellValue
                render
                tokens={summary.availableTokens}
                fiat={summary.availableFiat}
                symbol={isUniswapV2LpToken ? "" : token.symbol}
                balancesStatus={status}
                className={classNames(
                  status.status === "fetching" && "animate-pulse transition-opacity",
                )}
                noCountUp={noCountUp}
              />
            </div>

            {/* Expand/Collapse Button */}
            <div
              className={classNames(
                "flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200",
                "text-body-secondary hover:text-body hover:bg-grey-700",
                isExpanded && "bg-primary/20 text-primary hover:bg-primary/30",
                !isLoadingProducts &&
                  yieldProducts.length > 0 &&
                  !isExpanded &&
                  "bg-primary/10 text-primary",
              )}
              aria-label={isExpanded ? t("Collapse") : t("Expand")}
            >
              {isExpanded ? (
                <ChevronUpIcon className="h-5 w-5" />
              ) : (
                <ChevronDownIcon className="h-5 w-5" />
              )}
            </div>
          </div>
        </button>
      </div>

      {/* Expanded Yield Products Section */}
      {isExpanded && (
        <div className="overflow-hidden">
          <div className="bg-grey-800 border-grey-700 animate-fade-in rounded-b-lg border-t p-4">
            <div className="mb-3">
              <h3 className="text-body text-sm font-medium">
                {t("Available Earning Opportunities for {{symbol}}", { symbol: token.symbol })}
              </h3>
            </div>
            <div>
              {isLoadingProducts ? (
                <div className="flex h-32 items-center justify-center">
                  <div className="text-body-secondary text-sm">
                    {t("Loading earning opportunities...")}
                  </div>
                </div>
              ) : productsError ? (
                <div className="flex h-32 items-center justify-center">
                  <div className="text-body-secondary text-sm">
                    {t("Failed to load earning opportunities.")}
                  </div>
                </div>
              ) : yieldProducts.length === 0 ? (
                <div className="flex h-32 items-center justify-center">
                  <div className="text-body-secondary text-sm">
                    {t("No earning opportunities available for {{symbol}}.", {
                      symbol: token.symbol,
                    })}
                  </div>
                </div>
              ) : (
                <ProductList
                  products={yieldProducts}
                  tokenId={token.id}
                  isLoading={false}
                  error={null}
                  onProductClick={() => {}}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
