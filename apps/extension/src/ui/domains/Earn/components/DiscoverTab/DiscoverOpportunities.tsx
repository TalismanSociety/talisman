import { Networks, YieldDto } from "extension-core"
import { FC, useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import { EarnAccountPicker } from "@ui/domains/Earn/components/EarnAccountPicker"
import { ValidatorPicker } from "@ui/domains/Earn/components/ValidatorPicker"
import { ConfirmDepositModal } from "@ui/domains/Earn/ConfirmDepositModal"
import { DepositModal } from "@ui/domains/Earn/DepositModal"
import { mapYieldNetworkToNetworkId } from "@ui/domains/Earn/utils/networkMapping"
import { mapTokenSymbolToTokenId } from "@ui/domains/Earn/utils/tokenMapping"
import { useAccounts, useRemoteConfig, useTokens } from "@ui/state"
import { useInfiniteYieldProductsForToken } from "@ui/state/yield"
import { IS_POPUP } from "@ui/util/constants"

import { DiscoverTokenRow } from "./DiscoverTokenRow"

interface DiscoverOpportunitiesProps {
  isPopup?: boolean
}

// Component for individual token discovery with its yield products
const TokenDiscovery: FC<{
  tokenSymbol: string
  network: Networks
  tokenId?: string
  onProductClick: (product: YieldDto) => void
  isPopup?: boolean
  onMaxRewardRateUpdate?: (tokenKey: string, maxRewardRate: number) => void
}> = ({ tokenSymbol, network, tokenId, onProductClick, isPopup, onMaxRewardRateUpdate }) => {
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

  // Filter products based on status and availability (same as ProductList)
  const availableProducts = useMemo(() => {
    return allYieldProducts.filter(
      (product) =>
        product.status.enter && !product.metadata.underMaintenance && !product.metadata.deprecated,
    )
  }, [allYieldProducts])

  // Slice products for display (max 100)
  const visibleYieldProducts = useMemo(
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
      const tokenKey = `${tokenSymbol}-${network}`
      onMaxRewardRateUpdate(tokenKey, maxRewardRate)
    }
  }, [onMaxRewardRateUpdate, tokenSymbol, network, maxRewardRate])

  // Update show more handler
  const handleShowMore = useCallback(() => {
    setVisibleProductCount((prev) => Math.min(prev + 20, 100))
  }, [])

  // Determine if show more should be visible
  const shouldShowMore = visibleProductCount < 100 && visibleProductCount < availableProducts.length

  // Don't render if no products found
  if (!isLoading && availableProducts.length === 0) {
    return null
  }

  // Map yield network to network ID
  const networkId = mapYieldNetworkToNetworkId(network) || network

  return (
    <DiscoverTokenRow
      tokenSymbol={tokenSymbol}
      tokenLogoURI={visibleYieldProducts[0]?.inputTokens?.[0]?.logoURI}
      networkId={networkId}
      tokenId={tokenId}
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
  const navigate = useNavigate()
  const _accounts = useAccounts("owned")
  const tokens = useTokens()
  const remoteConfig = useRemoteConfig()
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
      setSelectedProduct(product)

      // Get tokenId for this product
      const inputToken = product.inputTokens?.[0]
      const tokenId = inputToken
        ? mapTokenSymbolToTokenId(inputToken.symbol, product.network, tokens)
        : null
      if (!tokenId) return
      setSelectedTokenId(tokenId)

      // Check if this product requires validator selection
      if (product?.mechanics?.requiresValidatorSelection) {
        if (IS_POPUP) {
          // Navigate to validator picker page in popup mode
          const params = new URLSearchParams({
            tokenId,
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
          `/select-product/select-account?tokenId=${encodeURIComponent(tokenId)}&productId=${encodeURIComponent(product.id)}`,
        )
      } else {
        // Show account picker modal in dashboard mode
        setIsAccountPickerOpen(true)
      }
    },
    [navigate, tokens],
  )

  // Modal callbacks
  const handleValidatorSelect = useCallback(
    (validator: { address: string }) => {
      setSelectedValidator(validator.address)
      setIsValidatorPickerOpen(false)

      // Always show account picker after validator selection
      if (IS_POPUP) {
        navigate(
          `/select-product/select-account?productId=${encodeURIComponent(selectedProduct?.id || "")}&validatorAddress=${encodeURIComponent(validator.address)}`,
        )
      } else {
        setIsAccountPickerOpen(true)
      }
    },
    [navigate, selectedProduct?.id],
  )

  const handleAccountSelect = useCallback(
    (address: string) => {
      setSelectedAccount(address)
      setIsAccountPickerOpen(false)

      if (IS_POPUP) {
        // Navigate to deposit amount page
        const params = new URLSearchParams({
          account: address,
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
    [navigate, selectedProduct?.id, selectedValidator],
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

  return (
    <div className="flex w-full flex-col gap-4">
      {sortedTokensToDiscover.map(({ symbol, network }) => {
        // Get tokenId for this token using the proper mapping function
        const tokenId = mapTokenSymbolToTokenId(symbol, network, tokens)

        return (
          <TokenDiscovery
            key={`${symbol}-${network}`}
            tokenSymbol={symbol}
            network={network}
            tokenId={tokenId || undefined}
            onProductClick={handleProductClick}
            isPopup={isPopup}
            onMaxRewardRateUpdate={updateTokenMaxRewardRate}
          />
        )
      })}

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
