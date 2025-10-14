import { YieldDto } from "extension-core"
import { FC, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { useDepositNavigation } from "@ui/domains/Earn/hooks/useDepositNavigation"
import { useUserTokensWithYield } from "@ui/domains/Earn/hooks/useUserTokensWithYield"
import { mapNetworkToYieldNetwork } from "@ui/domains/Earn/utils/networkMapping"
import { useNetworkById, useRemoteConfig } from "@ui/state"
import { useInfiniteYieldProductsForToken } from "@ui/state/yield"

import { DiscoverTokenRow } from "./DiscoverTokenRow"
import { ShowMoreButton } from "./ShowMoreButton"

interface EarnOnYourAssetsProps {
  isPopup?: boolean
}

// Component for individual token with its yield products
const TokenWithYields: FC<{
  tokenSymbol: string
  tokenLogoURI?: string
  networkId: string
  onProductClick: (product: YieldDto) => void
  isPopup?: boolean
  allowedNetworks: string[]
  onMaxRewardRateUpdate?: (tokenSymbol: string, maxRewardRate: number) => void
}> = ({
  tokenSymbol,
  tokenLogoURI,
  networkId,
  onProductClick,
  isPopup,
  allowedNetworks,
  onMaxRewardRateUpdate,
}) => {
  const network = useNetworkById(networkId)
  const mappedNetwork = mapNetworkToYieldNetwork(network)
  const [visibleProductCount, setVisibleProductCount] = useState(20)

  const { data, isLoading } = useInfiniteYieldProductsForToken(
    tokenSymbol,
    mappedNetwork || undefined,
  )

  // Flatten all pages and filter for exact token match
  const allProducts = useMemo(() => {
    const allProducts = data?.pages.flat() || []
    // Filter out products that don't match the requested inputToken exactly
    return allProducts.filter((product) =>
      product.inputTokens?.some(
        (token) => token.symbol?.toLowerCase() === tokenSymbol.toLowerCase(),
      ),
    )
  }, [data, tokenSymbol])

  // Slice products for display (max 100)
  const visibleProducts = useMemo(
    () => allProducts.slice(0, Math.min(visibleProductCount, 100)),
    [allProducts, visibleProductCount],
  )

  // Calculate and report max reward rate
  const maxRewardRate = useMemo(() => {
    if (allProducts.length === 0) return 0
    const maxRate = Math.max(...allProducts.map((p) => p.rewardRate?.total || 0))
    return maxRate
  }, [allProducts])

  // Report max reward rate to parent
  useMemo(() => {
    if (onMaxRewardRateUpdate && maxRewardRate > 0) {
      onMaxRewardRateUpdate(tokenSymbol, maxRewardRate)
    }
  }, [onMaxRewardRateUpdate, tokenSymbol, maxRewardRate])

  // Update show more handler
  const handleShowMore = useCallback(() => {
    setVisibleProductCount((prev) => Math.min(prev + 20, 100))
  }, [])

  // Determine if show more should be visible
  const shouldShowMore = visibleProductCount < 100 && visibleProductCount < allProducts.length

  // Don't render if network is not in allowed networks
  if (!mappedNetwork || !allowedNetworks.includes(mappedNetwork)) {
    return null
  }

  // Don't render if no products found
  if (!isLoading && allProducts.length === 0) {
    return null
  }

  return (
    <DiscoverTokenRow
      tokenSymbol={tokenSymbol}
      tokenLogoURI={tokenLogoURI}
      networkId={networkId}
      products={visibleProducts}
      onProductClick={onProductClick}
      isPopup={isPopup}
      isLoading={isLoading}
      hasMoreProducts={shouldShowMore}
      onShowMore={handleShowMore}
    />
  )
}

export const EarnOnYourAssets: FC<EarnOnYourAssetsProps> = ({ isPopup = false }) => {
  const { t } = useTranslation()
  const { userTokens, isLoading } = useUserTokensWithYield()
  const { navigateToDeposit } = useDepositNavigation()
  const remoteConfig = useRemoteConfig()
  const [visibleTokenCount, setVisibleTokenCount] = useState(20)
  const [tokenMaxRewardRates, setTokenMaxRewardRates] = useState<Map<string, number>>(new Map())

  // Get allowed yield networks from remote config
  const allowedNetworks = useMemo(() => {
    return Object.keys(remoteConfig.earn?.yieldxyzNetworks || {})
  }, [remoteConfig.earn?.yieldxyzNetworks])

  // Filter tokens to only include those from allowed networks
  // We'll filter them in the TokenWithYields component instead
  const filteredUserTokens = userTokens

  // Group filtered tokens by symbol
  const tokensWithProducts = useMemo(() => {
    const tokenMap = new Map<
      string,
      {
        tokenSymbol: string
        tokenLogoURI?: string
        networkId: string
      }
    >()

    filteredUserTokens.forEach((token) => {
      const existing = tokenMap.get(token.symbol)
      if (existing) {
        // Merge with existing token
      } else {
        tokenMap.set(token.symbol, {
          tokenSymbol: token.symbol,
          tokenLogoURI: token.logoURI,
          networkId: token.networkId,
        })
      }
    })

    return Array.from(tokenMap.values())
  }, [filteredUserTokens])

  // Callback to update max reward rate for a token
  const updateTokenMaxRewardRate = useCallback((tokenSymbol: string, maxRewardRate: number) => {
    setTokenMaxRewardRates((prev) => {
      const newMap = new Map(prev)
      newMap.set(tokenSymbol, maxRewardRate)
      return newMap
    })
  }, [])

  // Sort tokens by their max reward rate
  const sortedTokensWithProducts = useMemo(() => {
    return [...tokensWithProducts].sort((a, b) => {
      const aMaxRate = tokenMaxRewardRates.get(a.tokenSymbol) || 0
      const bMaxRate = tokenMaxRewardRates.get(b.tokenSymbol) || 0

      // Sort by max reward rate (highest first), then by symbol as fallback
      if (aMaxRate !== bMaxRate) {
        return bMaxRate - aMaxRate
      }
      return a.tokenSymbol.localeCompare(b.tokenSymbol)
    })
  }, [tokensWithProducts, tokenMaxRewardRates])

  const handleProductClick = useCallback(
    (product: YieldDto) => {
      // For now, use the first account from the first token
      // In a real implementation, you'd want to handle account selection
      const firstToken = userTokens[0]
      const firstAccount = firstToken?.accounts[0]
      if (!firstAccount || !firstToken) return

      navigateToDeposit({
        account: firstAccount.address,
        tokenId: firstToken.tokenId,
        productId: product.id,
      })
    },
    [navigateToDeposit, userTokens],
  )

  const handleShowMore = useCallback(() => {
    setVisibleTokenCount((prev) => prev + 20)
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-grey-700 h-20 w-full animate-pulse rounded"></div>
        ))}
      </div>
    )
  }

  if (!userTokens.length) {
    return (
      <div className="text-body-secondary bg-black-secondary rounded-sm py-10 text-center text-xs">
        {t("No yield products available for your tokens")}
      </div>
    )
  }

  const visibleTokens = sortedTokensWithProducts.slice(0, visibleTokenCount)

  return (
    <div className="flex w-full flex-col gap-4">
      {visibleTokens.map((tokenData) => (
        <TokenWithYields
          key={tokenData.tokenSymbol}
          tokenSymbol={tokenData.tokenSymbol}
          tokenLogoURI={tokenData.tokenLogoURI}
          networkId={tokenData.networkId}
          onProductClick={handleProductClick}
          isPopup={isPopup}
          allowedNetworks={allowedNetworks}
          onMaxRewardRateUpdate={updateTokenMaxRewardRate}
        />
      ))}
      <ShowMoreButton
        onClick={handleShowMore}
        itemsShown={visibleTokenCount}
        totalItems={sortedTokensWithProducts.length}
        isPopup={isPopup}
      />
    </div>
  )
}
