import { useQuery } from "@tanstack/react-query"
import { fetchYieldProducts, Networks, YieldDto } from "extension-core"
import { FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { DISCOVER_NETWORKS } from "@ui/domains/Earn/config/discoverNetworks"
import { useDepositNavigation } from "@ui/domains/Earn/hooks/useDepositNavigation"
import { useAccounts } from "@ui/state"

import { DiscoverTokenRow } from "./DiscoverTokenRow"

interface DiscoverOpportunitiesProps {
  isPopup?: boolean
}

export const DiscoverOpportunities: FC<DiscoverOpportunitiesProps> = ({ isPopup = false }) => {
  const { t } = useTranslation()
  const { navigateToDeposit } = useDepositNavigation()
  const accounts = useAccounts("owned")

  // Fetch yield products for all discover networks
  const {
    data: yieldProducts = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["yieldProducts", "discover"],
    queryFn: async () => {
      const results = await Promise.all(
        DISCOVER_NETWORKS.map((network) =>
          fetchYieldProducts({ network } as { network: Networks }),
        ),
      )
      return results.flat()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 1 * 60 * 1000, // Refetch every 1 minute
  })

  // Group products by input token symbol
  const tokensWithProducts = useMemo(() => {
    const tokenMap = new Map<
      string,
      {
        tokenSymbol: string
        tokenLogoURI?: string
        networkId: string
        totalBalance: number
        totalBalanceUsd: number
        products: YieldDto[]
      }
    >()

    yieldProducts.forEach((product) => {
      const inputToken = product.inputTokens?.[0]
      if (!inputToken?.symbol) return

      const existing = tokenMap.get(inputToken.symbol)
      if (existing) {
        existing.products.push(product)
      } else {
        tokenMap.set(inputToken.symbol, {
          tokenSymbol: inputToken.symbol,
          tokenLogoURI: inputToken.logoURI,
          networkId: product.network, // This will need to be mapped to actual networkId
          totalBalance: 0, // No balance for discover opportunities
          totalBalanceUsd: 0,
          products: [product],
        })
      }
    })

    // Convert to array and sort by number of products
    return Array.from(tokenMap.values()).sort((a, b) => b.products.length - a.products.length)
  }, [yieldProducts])

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

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-grey-700 h-20 w-full animate-pulse rounded"></div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-body-secondary bg-black-secondary rounded-sm py-10 text-center text-xs">
        {t("Failed to load earning products.")}
      </div>
    )
  }

  if (!tokensWithProducts.length) {
    return (
      <div className="text-body-secondary bg-black-secondary rounded-sm py-10 text-center text-xs">
        {t("No earning products available.")}
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {tokensWithProducts.map((tokenData) => (
        <DiscoverTokenRow
          key={tokenData.tokenSymbol}
          tokenSymbol={tokenData.tokenSymbol}
          tokenLogoURI={tokenData.tokenLogoURI}
          networkId={tokenData.networkId}
          totalBalance={tokenData.totalBalance}
          totalBalanceUsd={tokenData.totalBalanceUsd}
          products={tokenData.products}
          onProductClick={handleProductClick}
          isPopup={isPopup}
        />
      ))}
    </div>
  )
}
