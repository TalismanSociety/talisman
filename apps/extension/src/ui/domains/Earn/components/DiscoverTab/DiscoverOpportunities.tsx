import { Networks, YieldDto } from "extension-core"
import { FC, useCallback, useMemo, useState } from "react"

import { useDepositNavigation } from "@ui/domains/Earn/hooks/useDepositNavigation"
import { mapYieldNetworkToNetworkId } from "@ui/domains/Earn/utils/networkMapping"
import { useAccounts, useRemoteConfig } from "@ui/state"
import { useInfiniteYieldProductsForToken } from "@ui/state/yield"

import { DiscoverTokenRow } from "./DiscoverTokenRow"

interface DiscoverOpportunitiesProps {
  isPopup?: boolean
}

// Component for individual token discovery with its yield products
const TokenDiscovery: FC<{
  tokenSymbol: string
  network: Networks
  onProductClick: (product: YieldDto) => void
  isPopup?: boolean
  onMaxRewardRateUpdate?: (tokenKey: string, maxRewardRate: number) => void
}> = ({ tokenSymbol, network, onProductClick, isPopup, onMaxRewardRateUpdate }) => {
  const [visibleProductCount, setVisibleProductCount] = useState(20)

  const { data, isLoading } = useInfiniteYieldProductsForToken(tokenSymbol, network)

  // Flatten all pages and filter for exact token match
  const allYieldProducts = useMemo(() => {
    const allProducts = data?.pages.flat() || []
    // Filter out products that don't match the requested inputToken exactly
    return allProducts.filter((product) =>
      product.inputTokens?.some(
        (token) => token.symbol?.toLowerCase() === tokenSymbol.toLowerCase(),
      ),
    )
  }, [data, tokenSymbol])

  // Slice products for display (max 100)
  const visibleYieldProducts = useMemo(
    () => allYieldProducts.slice(0, Math.min(visibleProductCount, 100)),
    [allYieldProducts, visibleProductCount],
  )

  // Calculate and report max reward rate
  const maxRewardRate = useMemo(() => {
    if (allYieldProducts.length === 0) return 0
    const maxRate = Math.max(...allYieldProducts.map((p) => p.rewardRate?.total || 0))
    return maxRate
  }, [allYieldProducts])

  // Report max reward rate to parent
  useMemo(() => {
    if (onMaxRewardRateUpdate && maxRewardRate > 0) {
      const tokenKey = `${tokenSymbol}-${network}`
      onMaxRewardRateUpdate(tokenKey, maxRewardRate)
    }
  }, [onMaxRewardRateUpdate, tokenSymbol, network, maxRewardRate])

  // Update show more handler
  const handleShowMore = useCallback(() => {
    setVisibleProductCount((prev) => Math.min(prev + 20, 100))
  }, [])

  // Determine if show more should be visible
  const shouldShowMore = visibleProductCount < 100 && visibleProductCount < allYieldProducts.length

  // Don't render if no products found
  if (!isLoading && allYieldProducts.length === 0) {
    return null
  }

  // Map yield network to network ID
  const networkId = mapYieldNetworkToNetworkId(network) || network

  return (
    <DiscoverTokenRow
      tokenSymbol={tokenSymbol}
      tokenLogoURI={visibleYieldProducts[0]?.inputTokens?.[0]?.logoURI}
      networkId={networkId}
      products={visibleYieldProducts}
      onProductClick={onProductClick}
      isPopup={isPopup}
      isLoading={isLoading}
      hasMoreProducts={shouldShowMore}
      onShowMore={handleShowMore}
    />
  )
}

export const DiscoverOpportunities: FC<DiscoverOpportunitiesProps> = ({ isPopup = false }) => {
  const { navigateToDeposit } = useDepositNavigation()
  const accounts = useAccounts("owned")
  const remoteConfig = useRemoteConfig()
  const [tokenMaxRewardRates, setTokenMaxRewardRates] = useState<Map<string, number>>(new Map())

  // Get allowed yield networks from remote config
  const allowedNetworks = useMemo(() => {
    const networks = Object.keys(remoteConfig.earn?.yieldxyzNetworks || {})
    // Fallback to default networks if none configured
    return networks.length > 0 ? networks : []
  }, [remoteConfig.earn?.yieldxyzNetworks])

  // Define tokens to discover for each network
  const tokensToDiscover = useMemo(() => {
    const tokens = []
    for (const network of allowedNetworks) {
      // Add common tokens for each network
      switch (network) {
        case "ethereum":
          tokens.push({ symbol: "ETH", network: network as Networks })
          tokens.push({ symbol: "USDC", network: network as Networks })
          tokens.push({ symbol: "USDT", network: network as Networks })
          break
        case "polkadot":
          tokens.push({ symbol: "DOT", network: network as Networks })
          break
        case "solana":
          tokens.push({ symbol: "SOL", network: network as Networks })
          tokens.push({ symbol: "USDC", network: network as Networks })
          break
        case "base":
          tokens.push({ symbol: "ETH", network: network as Networks })
          tokens.push({ symbol: "USDC", network: network as Networks })
          break
        case "arbitrum":
          tokens.push({ symbol: "ETH", network: network as Networks })
          tokens.push({ symbol: "USDC", network: network as Networks })
          break
        case "optimism":
          tokens.push({ symbol: "ETH", network: network as Networks })
          tokens.push({ symbol: "USDC", network: network as Networks })
          break
        case "polygon":
          tokens.push({ symbol: "MATIC", network: network as Networks })
          tokens.push({ symbol: "USDC", network: network as Networks })
          break
      }
    }
    return tokens
  }, [allowedNetworks])

  // Callback to update max reward rate for a token
  const updateTokenMaxRewardRate = useCallback((tokenSymbol: string, maxRewardRate: number) => {
    setTokenMaxRewardRates((prev) => {
      const newMap = new Map(prev)
      newMap.set(tokenSymbol, maxRewardRate)
      return newMap
    })
  }, [])

  // Sort tokens by their max reward rate
  const sortedTokensToDiscover = useMemo(() => {
    return [...tokensToDiscover].sort((a, b) => {
      const aKey = `${a.symbol}-${a.network}`
      const bKey = `${b.symbol}-${b.network}`
      const aMaxRate = tokenMaxRewardRates.get(aKey) || 0
      const bMaxRate = tokenMaxRewardRates.get(bKey) || 0

      // Sort by max reward rate (highest first), then by network and symbol as fallback
      if (aMaxRate !== bMaxRate) {
        return bMaxRate - aMaxRate
      }
      if (a.network !== b.network) {
        return a.network.localeCompare(b.network)
      }
      return a.symbol.localeCompare(b.symbol)
    })
  }, [tokensToDiscover, tokenMaxRewardRates])

  const handleProductClick = useCallback(
    (product: YieldDto) => {
      // For discover opportunities, we need to handle account selection
      // For now, use the first account if available
      const firstAccount = accounts[0]
      if (!firstAccount) {
        // TODO: Show account picker or handle no accounts case
        return
      }

      // We need to get the tokenId for the input token
      // This is a simplified approach - in reality you'd need to map the token symbol to tokenId
      const inputToken = product.inputTokens?.[0]
      if (!inputToken?.symbol) return

      // For now, we'll use a placeholder tokenId
      // In a real implementation, you'd need to map the symbol to the actual tokenId
      const tokenId = `placeholder-${inputToken.symbol.toLowerCase()}` as const

      navigateToDeposit({
        account: firstAccount.address,
        tokenId,
        productId: product.id,
      })
    },
    [navigateToDeposit, accounts],
  )

  return (
    <div className="flex w-full flex-col gap-4">
      {sortedTokensToDiscover.map(({ symbol, network }) => (
        <TokenDiscovery
          key={`${symbol}-${network}`}
          tokenSymbol={symbol}
          network={network}
          onProductClick={handleProductClick}
          isPopup={isPopup}
          onMaxRewardRateUpdate={updateTokenMaxRewardRate}
        />
      ))}
    </div>
  )
}
