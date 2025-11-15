import type { TokenOfPlatform } from "@talismn/chaindata-provider"
import { Networks, YieldDto } from "extension-core"
import { FC, useCallback, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import { EarnAccountPicker } from "@ui/domains/Earn/components/EarnAccountPicker"
import { ValidatorPicker } from "@ui/domains/Earn/components/ValidatorPicker"
import { ConfirmDepositModal } from "@ui/domains/Earn/ConfirmDepositModal"
import { DepositModal } from "@ui/domains/Earn/DepositModal"
import { useYieldProductsByNetwork } from "@ui/domains/Earn/hooks/useYieldProductsByNetwork"
import { mapYieldNetworkToNetworkId } from "@ui/domains/Earn/utils/networkMapping"
import { mapYieldTokenToTokenId } from "@ui/domains/Earn/utils/tokenMapping"
import { getTokenAddress } from "@ui/domains/Earn/utils/tokenUtils"
import { useAccounts, useRemoteConfig, useToken, useTokens } from "@ui/state"
import { useDiscoverSearch } from "@ui/state/yield"
import { IS_POPUP } from "@ui/util/constants"

import { DiscoverTokenRow } from "./DiscoverTokenRow"

interface DiscoverOpportunitiesProps {
  isPopup?: boolean
}

// Network-level component that fetches once per network
const NetworkTokensGroup: FC<{
  network: string
  tokens: Array<{
    symbol: string
    network: Networks
    tokenId?: string
  }>
  onProductClick: (product: YieldDto) => void
  isPopup?: boolean
  allTokens: (
    | TokenOfPlatform<"ethereum">
    | TokenOfPlatform<"polkadot">
    | TokenOfPlatform<"solana">
  )[]
  search?: string
}> = ({ network, tokens: networkTokens, onProductClick, isPopup, allTokens, search }) => {
  // For discovery, we'll use token symbols as identifiers since we don't have specific addresses
  // The API will handle symbol-based matching
  const tokenIdentifiers = networkTokens.map((t) => t.symbol)

  // Fetch products for all tokens on this network
  const { data: networkProducts = [], isLoading: isLoadingNetworkProducts } =
    useYieldProductsByNetwork(network as Networks, tokenIdentifiers)

  // Sort tokens by highest APY
  const sortedTokens = useMemo(() => {
    if (!networkProducts.length) return networkTokens

    return networkTokens
      .map((token) => {
        const tokenIdentifier = token.symbol.toLowerCase()
        // Find max reward rate for this token
        const maxRate = networkProducts.reduce((max, product) => {
          const matches = product.inputTokens?.some((inputToken) => {
            const symbol = inputToken.symbol?.toLowerCase()
            return symbol === tokenIdentifier
          })
          if (matches) {
            return Math.max(max, product.rewardRate?.total || 0)
          }
          return max
        }, 0)
        return { ...token, maxRate }
      })
      .sort((a, b) => b.maxRate - a.maxRate)
  }, [networkTokens, networkProducts])

  return (
    <>
      {sortedTokens.map((token) => {
        const tokenId = mapYieldTokenToTokenId(token.symbol, token.network, allTokens)
        return (
          <TokenDiscovery
            key={`${token.symbol}-${token.network}`}
            tokenSymbol={token.symbol}
            network={token.network}
            tokenId={tokenId || undefined}
            onProductClick={onProductClick}
            isPopup={isPopup}
            networkProducts={networkProducts}
            isLoadingNetworkProducts={isLoadingNetworkProducts}
            search={search}
          />
        )
      })}
    </>
  )
}

// Component for individual token discovery with its yield products
const TokenDiscovery: FC<{
  tokenSymbol: string
  network: Networks
  tokenId?: string
  onProductClick: (product: YieldDto) => void
  isPopup?: boolean
  networkProducts?: YieldDto[] // Network-level products passed from parent
  isLoadingNetworkProducts?: boolean // Loading state from network-level fetch
  search?: string // Search query for filtering products
}> = ({
  tokenSymbol,
  network,
  tokenId,
  onProductClick,
  isPopup,
  networkProducts = [],
  isLoadingNetworkProducts = false,
  search,
}) => {
  const [visibleProductCount, setVisibleProductCount] = useState(20)
  const token = useToken(tokenId)

  // Get token address if available, fallback to symbol
  const tokenIdentifier = useMemo(() => {
    const address = getTokenAddress(token)
    return address || tokenSymbol
  }, [token, tokenSymbol])

  // Filter network-level products for this specific token
  const allYieldProducts = useMemo(() => {
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
      const matchesNetwork = product.network === network

      return matchesToken && matchesNetwork
    })
  }, [networkProducts, tokenIdentifier, network])

  // Filter products based on status and availability (same as ProductList)
  const availableProducts = useMemo(() => {
    const filtered = allYieldProducts.filter(
      (product) =>
        product.status.enter && !product.metadata.underMaintenance && !product.metadata.deprecated,
    )

    // Apply search filter if provided
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
  }, [allYieldProducts, search, tokenSymbol])

  // Sort products by reward rate (highest first)
  const sortedProducts = useMemo(() => {
    return [...availableProducts].sort(
      (a, b) => (b.rewardRate?.total || 0) - (a.rewardRate?.total || 0),
    )
  }, [availableProducts])

  // Slice products for display (max 100)
  const visibleYieldProducts = useMemo(
    () => sortedProducts.slice(0, Math.min(visibleProductCount, 100)),
    [sortedProducts, visibleProductCount],
  )

  // Update show more handler
  const handleShowMore = useCallback(() => {
    setVisibleProductCount((prev) => Math.min(prev + 20, 100))
  }, [])

  // Determine if show more should be visible
  const shouldShowMore = visibleProductCount < 100 && visibleProductCount < sortedProducts.length

  // Don't render if no products found
  if (!isLoadingNetworkProducts && availableProducts.length === 0) {
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
      isLoading={isLoadingNetworkProducts}
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
  const search = useDiscoverSearch()

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

  // Group tokens by network for batched fetching
  // Note: We don't filter tokens here based on search - we filter products later
  // This allows tokens to show up if they have products matching the search,
  // even if the token symbol itself doesn't match
  const tokensByNetwork = useMemo(() => {
    const grouped: Record<
      string,
      Array<{
        symbol: string
        network: Networks
        tokenId?: string
      }>
    > = {}

    for (const network of allowedNetworks) {
      const networkTokens = []

      // Add common tokens for each network
      switch (network) {
        case "ethereum":
          networkTokens.push({ symbol: "ETH", network: network as Networks })
          networkTokens.push({ symbol: "USDC", network: network as Networks })
          networkTokens.push({ symbol: "USDT", network: network as Networks })
          break
        case "polkadot":
          networkTokens.push({ symbol: "DOT", network: network as Networks })
          break
        case "solana":
          networkTokens.push({ symbol: "SOL", network: network as Networks })
          networkTokens.push({ symbol: "USDC", network: network as Networks })
          break
        case "base":
          networkTokens.push({ symbol: "ETH", network: network as Networks })
          networkTokens.push({ symbol: "USDC", network: network as Networks })
          break
        case "arbitrum":
          networkTokens.push({ symbol: "ETH", network: network as Networks })
          networkTokens.push({ symbol: "USDC", network: network as Networks })
          break
        case "optimism":
          networkTokens.push({ symbol: "ETH", network: network as Networks })
          networkTokens.push({ symbol: "USDC", network: network as Networks })
          break
        case "polygon":
          networkTokens.push({ symbol: "MATIC", network: network as Networks })
          networkTokens.push({ symbol: "USDC", network: network as Networks })
          break
      }

      if (networkTokens.length > 0) {
        grouped[network] = networkTokens
      }
    }

    return grouped
  }, [allowedNetworks])

  const handleProductClick = useCallback(
    (product: YieldDto) => {
      setSelectedProduct(product)

      // Get tokenId for this product
      const inputToken = product.inputTokens?.[0]
      const tokenId = inputToken
        ? mapYieldTokenToTokenId(inputToken.symbol, product.network, tokens)
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
        // Navigate to deposit amount page without account in URL (account is stored in local state)
        const params = new URLSearchParams({
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
      {Object.entries(tokensByNetwork).map(([network, networkTokens]) => (
        <NetworkTokensGroup
          key={network}
          network={network}
          tokens={networkTokens}
          onProductClick={handleProductClick}
          isPopup={isPopup}
          allTokens={tokens}
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
