import { YieldDto } from "extension-core"
import { FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { useDepositNavigation } from "@ui/domains/Earn/hooks/useDepositNavigation"
import { useUserTokensWithYield } from "@ui/domains/Earn/hooks/useUserTokensWithYield"
import { mapNetworkToYieldNetwork } from "@ui/domains/Earn/utils/networkMapping"
import { useNetworkById } from "@ui/state"
import { useYieldProducts } from "@ui/state/yield"

import { DiscoverTokenRow } from "./DiscoverTokenRow"

interface EarnOnYourAssetsProps {
  isPopup?: boolean
}

export const EarnOnYourAssets: FC<EarnOnYourAssetsProps> = ({ isPopup = false }) => {
  const { t } = useTranslation()
  const { userTokens, isLoading } = useUserTokensWithYield()
  const { navigateToDeposit } = useDepositNavigation()

  // Group tokens by symbol and fetch yield products for each
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

    userTokens.forEach((token) => {
      const existing = tokenMap.get(token.symbol)
      if (existing) {
        // Merge with existing token
        existing.totalBalance += token.totalBalance
        existing.totalBalanceUsd += token.totalBalanceUsd
      } else {
        tokenMap.set(token.symbol, {
          tokenSymbol: token.symbol,
          tokenLogoURI: token.logoURI,
          networkId: token.networkId,
          totalBalance: token.totalBalance,
          totalBalanceUsd: token.totalBalanceUsd,
          products: [],
        })
      }
    })

    return Array.from(tokenMap.values())
  }, [userTokens])

  // For now, we'll fetch products for the first token as an example
  // In a real implementation, you'd want to fetch for all tokens
  const firstToken = userTokens[0]
  const network = useNetworkById(firstToken?.networkId)
  const mappedNetwork = mapNetworkToYieldNetwork(network)

  const { data: yieldProducts = [], isLoading: productsLoading } = useYieldProducts({
    inputToken: firstToken?.symbol,
    network: mappedNetwork || undefined,
  })

  const handleProductClick = useCallback(
    (product: YieldDto) => {
      // For now, use the first account from the first token
      // In a real implementation, you'd want to handle account selection
      const firstAccount = firstToken?.accounts[0]
      if (!firstAccount || !firstToken) return

      navigateToDeposit({
        account: firstAccount.address,
        tokenId: firstToken.tokenId,
        productId: product.id,
      })
    },
    [navigateToDeposit, firstToken],
  )

  if (isLoading || productsLoading) {
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
          products={yieldProducts}
          onProductClick={handleProductClick}
          isPopup={isPopup}
        />
      ))}
    </div>
  )
}
