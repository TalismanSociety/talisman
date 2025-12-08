import { Networks, YieldDto } from "extension-core"
import { FC, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { EarnAccountPicker } from "@ui/domains/Earn/components/EarnAccountPicker"
import { ValidatorPicker } from "@ui/domains/Earn/components/ValidatorPicker"
import { DepositModal } from "@ui/domains/Earn/DepositModal"
import {
  GroupedToken,
  useTokensByYieldNetwork,
} from "@ui/domains/Earn/hooks/useTokensByYieldNetwork"
import { useUserTokensWithYield } from "@ui/domains/Earn/hooks/useUserTokensWithYield"
import { useYieldProductsByNetwork } from "@ui/domains/Earn/hooks/useYieldProductsByNetwork"
import { mapNetworkToYieldNetwork } from "@ui/domains/Earn/utils/networkMapping"
import { getTokenAddress } from "@ui/domains/Earn/utils/tokenUtils"
import { useNetworkById, useRemoteConfig, useToken } from "@ui/state"
import { IS_POPUP } from "@ui/util/constants"

import { ConfirmDepositModal } from "../.."
import { DiscoverTokenRow } from "./DiscoverTokenRow"

// Network-level component that fetches once per network
const NetworkTokensGroup: FC<{
  network: string
  tokens: GroupedToken[]
  onProductClick: (product: YieldDto) => void
  isPopup?: boolean
  allowedNetworks: string[]
  search?: string
}> = ({ network, tokens, onProductClick, isPopup, allowedNetworks, search }) => {
  // Extract token identifiers (prioritize contract addresses over symbols)
  const tokenIdentifiers = tokens.map((t) => t.tokenAddress || t.tokenSymbol)

  // Fetch products for all tokens on this network
  const { data: networkProducts = [], isLoading: isLoadingNetworkProducts } =
    useYieldProductsByNetwork(network as Networks, tokenIdentifiers)

  // Sort tokens by highest APY
  const sortedTokens = useMemo(() => {
    if (!networkProducts.length) return tokens

    return tokens
      .map((token) => {
        const tokenIdentifier = (token.tokenAddress || token.tokenSymbol).toLowerCase()
        // Find max reward rate for this token
        const maxRate = networkProducts.reduce((max, product) => {
          const matches = product.inputTokens?.some((inputToken) => {
            const symbol = inputToken.symbol?.toLowerCase()
            const address = inputToken.address?.toLowerCase()
            const identifier = tokenIdentifier

            // Prioritize address matching if both have addresses
            if (address && identifier.startsWith("0x")) {
              return address === identifier
            }
            // Fallback to symbol matching
            return symbol === identifier
          })
          if (matches) {
            return Math.max(max, product.rewardRate?.total || 0)
          }
          return max
        }, 0)
        return { ...token, maxRate }
      })
      .sort((a, b) => b.maxRate - a.maxRate)
  }, [tokens, networkProducts])

  return (
    <>
      {sortedTokens.map((token) => (
        <TokenWithYields
          key={`${token.tokenId}-${token.networkId}`}
          tokenSymbol={token.tokenSymbol}
          tokenLogoURI={token.tokenLogoURI}
          networkId={token.networkId}
          tokenId={token.tokenId}
          onProductClick={onProductClick}
          isPopup={isPopup}
          allowedNetworks={allowedNetworks}
          networkProducts={networkProducts}
          isLoadingNetworkProducts={isLoadingNetworkProducts}
          search={search}
        />
      ))}
    </>
  )
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
  networkProducts?: YieldDto[] // Network-level products passed from parent
  isLoadingNetworkProducts?: boolean // Loading state from network-level fetch
  search?: string // Search query for filtering products
}> = ({
  tokenSymbol,
  tokenLogoURI,
  networkId,
  tokenId,
  onProductClick,
  isPopup,
  allowedNetworks,
  networkProducts = [],
  isLoadingNetworkProducts = false,
  search,
}) => {
  const network = useNetworkById(networkId)
  const token = useToken(tokenId)
  const mappedNetwork = mapNetworkToYieldNetwork(network)
  const [visibleProductCount, setVisibleProductCount] = useState(20)

  // Get token address if available, fallback to symbol
  const tokenIdentifier = useMemo(() => {
    const address = getTokenAddress(token)
    return address || tokenSymbol
  }, [token, tokenSymbol])

  // Filter network-level products for this specific token
  const allProducts = useMemo(() => {
    if (!networkProducts.length) return []

    // Filter out products that don't match the requested inputToken exactly
    // Also ensure the product is available on the current network
    return networkProducts.filter((product) => {
      // Check if product matches the token identifier
      const matchesToken = product.inputTokens?.some((inputToken) => {
        const symbol = inputToken.symbol?.toLowerCase()
        const address = inputToken.address?.toLowerCase()
        const identifier = tokenIdentifier.toLowerCase()

        // Match by address first if both have addresses, then fallback to symbol
        if (address && identifier.startsWith("0x")) {
          return address === identifier
        }
        return symbol === identifier
      })

      // Check if product is available on the current network
      const matchesNetwork = product.network === mappedNetwork

      return matchesToken && matchesNetwork
    })
  }, [networkProducts, tokenIdentifier, mappedNetwork])

  // Filter products based on status and availability (same as ProductList)
  const availableProducts = useMemo(() => {
    const filtered = allProducts.filter(
      (product) =>
        product.status.enter && !product.metadata.underMaintenance && !product.metadata.deprecated,
    )

    // Apply search filter if provided (same logic as DiscoverOpportunities)
    const lowerSearch = (search || "").toLowerCase().trim()
    if (!lowerSearch) return filtered

    // Check if token symbol matches search - if so, show all products for this token
    const tokenSymbolLower = tokenSymbol.toLowerCase()
    if (tokenSymbolLower.includes(lowerSearch)) {
      return filtered
    }

    // Otherwise, filter products by search query
    return filtered.filter((product) => {
      const haystack: string[] = [
        product.metadata.name,
        product.metadata.description,
        product.inputTokens?.[0]?.symbol,
        product.outputToken?.symbol,
        product.mechanics?.type,
      ]
        .filter(Boolean)
        .map((v) => String(v).toLowerCase())

      return haystack.some((text) => text.includes(lowerSearch))
    })
  }, [allProducts, search, tokenSymbol])

  // Sort products by reward rate (highest first)
  const sortedProducts = useMemo(() => {
    return [...availableProducts].sort(
      (a, b) => (b.rewardRate?.total || 0) - (a.rewardRate?.total || 0),
    )
  }, [availableProducts])

  // Slice products for display (max 100)
  const visibleProducts = useMemo(
    () => sortedProducts.slice(0, Math.min(visibleProductCount, 100)),
    [sortedProducts, visibleProductCount],
  )

  // Update show more handler
  const handleShowMore = useCallback(() => {
    setVisibleProductCount((prev) => Math.min(prev + 20, 100))
  }, [])

  // Determine if show more should be visible
  const shouldShowMore = visibleProductCount < 100 && visibleProductCount < sortedProducts.length

  // Don't render if network is not in allowed networks
  if (!mappedNetwork || !allowedNetworks.includes(mappedNetwork)) {
    return null
  }

  // Don't render if no products found (after filtering)
  if (!isLoadingNetworkProducts && availableProducts.length === 0) {
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
      isLoading={isLoadingNetworkProducts}
      hasMoreProducts={shouldShowMore}
      onShowMore={handleShowMore}
    />
  )
}

export const EarnOnYourAssets: FC<{
  isPopup?: boolean
  search: string
}> = ({ isPopup = false, search }) => {
  const { t } = useTranslation()
  const { userTokens, isLoading } = useUserTokensWithYield()
  const navigate = useNavigate()
  const remoteConfig = useRemoteConfig()

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
    const configuredNetworks = Object.keys(remoteConfig.earn?.yieldxyzNetworks || {})

    // If no networks are configured, use default fallback networks
    if (configuredNetworks.length === 0) {
      return ["ethereum", "base", "polygon", "arbitrum", "optimism"]
    }

    return configuredNetworks
  }, [remoteConfig.earn?.yieldxyzNetworks])

  // Group tokens by yield network using custom hook
  const tokensByNetwork = useTokensByYieldNetwork(
    userTokens,
    allowedNetworks,
    remoteConfig.earn?.yieldxyzNetworks || {
      // Fallback network mapping when remote config is empty
      ethereum: "1",
      base: "8453",
      polygon: "137",
      arbitrum: "42161",
      optimism: "10",
    },
  )

  // Group tokens by network (sorting now happens in NetworkTokensGroup by APY)
  // Note: We don't filter tokens here based on search - we filter products later
  // This allows tokens to show up if they have products matching the search,
  // even if the token symbol itself doesn't match (same as DiscoverOpportunities)
  const sortedTokensByNetwork = useMemo(() => {
    return Object.entries(tokensByNetwork).map(([network, tokens]) => ({
      network,
      tokens, // No sorting here, will be sorted in NetworkTokensGroup by APY
    }))
  }, [tokensByNetwork])

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
        // Navigate to deposit amount page without account in URL (account is stored in local state)
        const params = new URLSearchParams({
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

  return (
    <div className="flex w-full flex-col gap-4">
      {sortedTokensByNetwork.map(({ network, tokens }) => (
        <NetworkTokensGroup
          key={network}
          network={network}
          tokens={tokens}
          onProductClick={handleProductClick}
          isPopup={isPopup}
          allowedNetworks={allowedNetworks}
          search={search}
        />
      ))}

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
