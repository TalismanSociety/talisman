import { YieldDto } from "extension-core"
import { FC, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { EarnAccountPicker } from "@ui/domains/Earn/components/EarnAccountPicker"
import { ValidatorPicker } from "@ui/domains/Earn/components/ValidatorPicker"
import { ConfirmDepositModal } from "@ui/domains/Earn/ConfirmDepositModal"
import { DepositModal } from "@ui/domains/Earn/DepositModal"
import { useUserTokensWithYield } from "@ui/domains/Earn/hooks/useUserTokensWithYield"
import { mapNetworkToYieldNetwork } from "@ui/domains/Earn/utils/networkMapping"
import { useNetworkById, useRemoteConfig } from "@ui/state"
import { useInfiniteYieldProductsForToken } from "@ui/state/yield"
import { IS_POPUP } from "@ui/util/constants"

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
  tokenId: string
  onProductClick: (product: YieldDto) => void
  isPopup?: boolean
  allowedNetworks: string[]
  onMaxRewardRateUpdate?: (tokenSymbol: string, maxRewardRate: number) => void
}> = ({
  tokenSymbol,
  tokenLogoURI,
  networkId,
  tokenId,
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

  // Filter products based on status and availability (same as ProductList)
  const availableProducts = useMemo(() => {
    return allProducts.filter(
      (product) =>
        product.status.enter && !product.metadata.underMaintenance && !product.metadata.deprecated,
    )
  }, [allProducts])

  // Slice products for display (max 100)
  const visibleProducts = useMemo(
    () => availableProducts.slice(0, Math.min(visibleProductCount, 100)),
    [availableProducts, visibleProductCount],
  )

  // Calculate and report max reward rate
  const maxRewardRate = useMemo(() => {
    if (availableProducts.length === 0) return 0
    const maxRate = Math.max(...availableProducts.map((p) => p.rewardRate?.total || 0))
    return maxRate
  }, [availableProducts])

  // Report max reward rate to parent
  useEffect(() => {
    if (onMaxRewardRateUpdate && maxRewardRate > 0) {
      onMaxRewardRateUpdate(tokenSymbol, maxRewardRate)
    }
  }, [onMaxRewardRateUpdate, tokenSymbol, maxRewardRate])

  // Update show more handler
  const handleShowMore = useCallback(() => {
    setVisibleProductCount((prev) => Math.min(prev + 20, 100))
  }, [])

  // Determine if show more should be visible
  const shouldShowMore = visibleProductCount < 100 && visibleProductCount < availableProducts.length

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
      tokenId={tokenId}
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
  const navigate = useNavigate()
  const remoteConfig = useRemoteConfig()
  const [visibleTokenCount, setVisibleTokenCount] = useState(20)
  const [tokenMaxRewardRates, setTokenMaxRewardRates] = useState<Map<string, number>>(new Map())

  // Modal state management
  const [isAccountPickerOpen, setIsAccountPickerOpen] = useState(false)
  const [isValidatorPickerOpen, setIsValidatorPickerOpen] = useState(false)
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<YieldDto | null>(null)
  const [selectedValidator, setSelectedValidator] = useState<string | null>(null)
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null)

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
        tokenId: string
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
          tokenId: token.tokenId,
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
      // Find the token that matches this product
      const matchingToken = userTokens.find((token) =>
        product.inputTokens?.some(
          (inputToken) => inputToken.symbol?.toLowerCase() === token.symbol.toLowerCase(),
        ),
      )

      if (!matchingToken) return

      setSelectedProduct(product)
      setSelectedTokenId(matchingToken.tokenId)

      // Check if this product requires validator selection
      if (product?.mechanics?.requiresValidatorSelection) {
        if (IS_POPUP) {
          // Navigate to validator picker page in popup mode
          const params = new URLSearchParams({
            tokenId: matchingToken.tokenId,
            productId: product.id,
          })
          navigate(`/select-product/select-validator?${params.toString()}`)
        } else {
          // Show validator picker modal in dashboard mode
          setIsValidatorPickerOpen(true)
        }
        return
      }

      // Always show account picker (per user requirement)
      if (IS_POPUP) {
        // Navigate to account picker page in popup mode
        navigate(
          `/select-product/select-account?tokenId=${encodeURIComponent(matchingToken.tokenId)}&productId=${encodeURIComponent(product.id)}`,
        )
      } else {
        // Show account picker modal in dashboard mode
        setIsAccountPickerOpen(true)
      }
    },
    [navigate, userTokens],
  )

  const handleShowMore = useCallback(() => {
    setVisibleTokenCount((prev) => prev + 20)
  }, [])

  // Modal callbacks
  const handleValidatorSelect = useCallback(
    (validator: { address: string }) => {
      setSelectedValidator(validator.address)
      setIsValidatorPickerOpen(false)

      // Always show account picker after validator selection
      if (IS_POPUP) {
        navigate(
          `/select-product/select-account?tokenId=${encodeURIComponent(selectedTokenId || "")}&productId=${encodeURIComponent(selectedProduct?.id || "")}&validatorAddress=${encodeURIComponent(validator.address)}`,
        )
      } else {
        setIsAccountPickerOpen(true)
      }
    },
    [navigate, selectedTokenId, selectedProduct?.id],
  )

  const handleAccountSelect = useCallback(
    (address: string) => {
      setSelectedAccount(address)
      setIsAccountPickerOpen(false)

      if (IS_POPUP) {
        // Navigate to deposit amount page
        const params = new URLSearchParams({
          account: address,
          tokenId: selectedTokenId || "",
          productId: selectedProduct?.id || "",
        })
        if (selectedValidator) {
          params.set("validatorAddress", selectedValidator)
        }
        navigate(`/select-product/deposit/amount?${params.toString()}`)
      } else {
        // Open deposit modal in dashboard mode
        setIsDepositModalOpen(true)
      }
    },
    [navigate, selectedTokenId, selectedProduct?.id, selectedValidator],
  )

  const handleDepositNext = useCallback(() => {
    setIsDepositModalOpen(false)
    setIsConfirmModalOpen(true)
  }, [])

  const handleDepositClose = useCallback(() => {
    setIsDepositModalOpen(false)
    setSelectedProduct(null)
    setSelectedValidator(null)
    setSelectedAccount(null)
    setSelectedTokenId(null)
  }, [])

  const handleConfirmClose = useCallback(() => {
    setIsConfirmModalOpen(false)
    setSelectedProduct(null)
    setSelectedValidator(null)
    setSelectedAccount(null)
    setSelectedTokenId(null)
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
          tokenId={tokenData.tokenId}
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

      {/* Modals for dashboard mode */}
      {!IS_POPUP && (
        <>
          <ValidatorPicker
            isOpen={isValidatorPickerOpen}
            yieldId={selectedProduct?.id || ""}
            onDismiss={() => {
              setIsValidatorPickerOpen(false)
              setSelectedProduct(null)
              setSelectedTokenId(null)
            }}
            onSelect={handleValidatorSelect}
          />

          <EarnAccountPicker
            isOpen={isAccountPickerOpen}
            tokenId={selectedTokenId || ""}
            onDismiss={() => setIsAccountPickerOpen(false)}
            onSelect={handleAccountSelect}
          />

          {selectedProduct && (
            <DepositModal
              isOpen={isDepositModalOpen}
              onClose={handleDepositClose}
              onNext={handleDepositNext}
              account={selectedAccount || ""}
              tokenId={selectedTokenId || ""}
              productId={selectedProduct.id}
              validatorAddress={selectedValidator || undefined}
            />
          )}

          {selectedProduct && (
            <ConfirmDepositModal
              isOpen={isConfirmModalOpen}
              onClose={handleConfirmClose}
              account={selectedAccount || ""}
              tokenId={selectedTokenId || ""}
              productId={selectedProduct.id}
            />
          )}
        </>
      )}
    </div>
  )
}
