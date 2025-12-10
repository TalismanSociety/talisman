import { Balances } from "@talismn/balances"
import { TokenId } from "@talismn/chaindata-provider"
import { normalizeAddress } from "@talismn/crypto"
import { ChevronRightIcon, LockIcon, UsersIcon } from "@talismn/icons"
import { cn, isNotNil, Loadable } from "@talismn/util"
import { YieldDto } from "extension-core"
import { t } from "i18next"
import { uniq } from "lodash-es"
import { FC, PropsWithChildren, ReactNode, useCallback, useMemo, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Tooltip, TooltipContent, TooltipTrigger, useOpenClose } from "talisman-ui"

import { TokenDisplaySymbol } from "@ui/domains/Asset/TokenDisplaySymbol"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { EarnAccountPicker } from "@ui/domains/Earn/components/EarnAccountPicker"
import { ValidatorPicker } from "@ui/domains/Earn/components/ValidatorPicker"
import { DepositModal } from "@ui/domains/Earn/DepositModal"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { NetworkName } from "@ui/domains/Networks/NetworkName"
import { usePortfolioNavigation } from "@ui/domains/Portfolio/usePortfolioNavigation"
import { useBalances, useNetworkById, useSelectedCurrency, useToken } from "@ui/state"
import { useYieldxyzOpportunities, useYieldxyzProviders } from "@ui/state/yield"
import { IS_POPUP } from "@ui/util/constants"

import { ConfirmDepositModal } from "../.."
import { EarnTypeBadge } from "../EarnTypeBadge"
import { useGetYieldxyzToken } from "../useGetYieldxyzToken"
import { YieldxyzProviderLogo } from "../YieldxyzProviderLogo"

// // Network-level component that fetches once per network
// const NetworkTokensGroup: FC<{
//   network: string
//   tokens: GroupedToken[]
//   onProductClick: (product: YieldDto) => void
//   isPopup?: boolean
//   allowedNetworks: string[]
//   search?: string
// }> = ({ network, tokens, onProductClick, isPopup, allowedNetworks, search }) => {
//   // Extract token identifiers (prioritize contract addresses over symbols)
//   const tokenIdentifiers = tokens.map((t) => t.tokenAddress || t.tokenSymbol)

//   // Fetch products for all tokens on this network
//   const { data: networkProducts = [], isLoading: isLoadingNetworkProducts } =
//     useYieldProductsByNetwork(network as Networks, tokenIdentifiers)

//   console.log("networkProducts", { network, tokens, networkProducts })

//   // Sort tokens by highest APY
//   const sortedTokens = useMemo(() => {
//     if (!networkProducts.length) return tokens

//     return tokens
//       .map((token) => {
//         const tokenIdentifier = (token.tokenAddress || token.tokenSymbol).toLowerCase()
//         // Find max reward rate for this token
//         const maxRate = networkProducts.reduce((max, product) => {
//           const matches = product.inputTokens?.some((inputToken) => {
//             const symbol = inputToken.symbol?.toLowerCase()
//             const address = inputToken.address?.toLowerCase()
//             const identifier = tokenIdentifier

//             // Prioritize address matching if both have addresses
//             if (address && identifier.startsWith("0x")) {
//               return address === identifier
//             }
//             // Fallback to symbol matching
//             return symbol === identifier
//           })
//           if (matches) {
//             return Math.max(max, product.rewardRate?.total || 0)
//           }
//           return max
//         }, 0)
//         return { ...token, maxRate }
//       })
//       .sort((a, b) => b.maxRate - a.maxRate)
//   }, [tokens, networkProducts])

//   return (
//     <>
//       {sortedTokens.map((token) => (
//         <TokenWithYields
//           key={`${token.tokenId}-${token.networkId}`}
//           tokenSymbol={token.tokenSymbol}
//           tokenLogoURI={token.tokenLogoURI}
//           networkId={token.networkId}
//           tokenId={token.tokenId}
//           onProductClick={onProductClick}
//           isPopup={isPopup}
//           allowedNetworks={allowedNetworks}
//           networkProducts={networkProducts}
//           isLoadingNetworkProducts={isLoadingNetworkProducts}
//           search={search}
//         />
//       ))}
//     </>
//   )
// }

// // Component for individual token with its yield products
// const TokenWithYields: FC<{
//   tokenSymbol: string
//   tokenLogoURI?: string
//   networkId: string
//   tokenId: string
//   onProductClick: (product: YieldDto) => void
//   isPopup?: boolean
//   allowedNetworks: string[]
//   networkProducts?: YieldDto[] // Network-level products passed from parent
//   isLoadingNetworkProducts?: boolean // Loading state from network-level fetch
//   search?: string // Search query for filtering products
// }> = ({
//   tokenSymbol,
//   tokenLogoURI,
//   networkId,
//   tokenId,
//   onProductClick,
//   isPopup,
//   allowedNetworks,
//   networkProducts = [],
//   isLoadingNetworkProducts = false,
//   search,
// }) => {
//   const network = useNetworkById(networkId)
//   const token = useToken(tokenId)
//   const mappedNetwork = mapNetworkToYieldNetwork(network)
//   const [visibleProductCount, setVisibleProductCount] = useState(20)

//   // Get token address if available, fallback to symbol
//   const tokenIdentifier = useMemo(() => {
//     const address = getYieldxyzTokenAddress(token)
//     return address || tokenSymbol
//   }, [token, tokenSymbol])

//   // Filter network-level products for this specific token
//   const allProducts = useMemo(() => {
//     if (!networkProducts.length) return []

//     // Filter out products that don't match the requested inputToken exactly
//     // Also ensure the product is available on the current network
//     return networkProducts.filter((product) => {
//       // Check if product matches the token identifier
//       const matchesToken = product.inputTokens?.some((inputToken) => {
//         const symbol = inputToken.symbol?.toLowerCase()
//         const address = inputToken.address?.toLowerCase()
//         const identifier = tokenIdentifier.toLowerCase()

//         // Match by address first if both have addresses, then fallback to symbol
//         if (address && identifier.startsWith("0x")) {
//           return address === identifier
//         }
//         return symbol === identifier
//       })

//       // Check if product is available on the current network
//       const matchesNetwork = product.network === mappedNetwork

//       return matchesToken && matchesNetwork
//     })
//   }, [networkProducts, tokenIdentifier, mappedNetwork])

//   // Filter products based on status and availability (same as ProductList)
//   const availableProducts = useMemo(() => {
//     const filtered = allProducts.filter(
//       (product) =>
//         product.status.enter && !product.metadata.underMaintenance && !product.metadata.deprecated,
//     )

//     // Apply search filter if provided (same logic as DiscoverOpportunities)
//     const lowerSearch = (search || "").toLowerCase().trim()
//     if (!lowerSearch) return filtered

//     // Check if token symbol matches search - if so, show all products for this token
//     const tokenSymbolLower = tokenSymbol.toLowerCase()
//     if (tokenSymbolLower.includes(lowerSearch)) {
//       return filtered
//     }

//     // Otherwise, filter products by search query
//     return filtered.filter((product) => {
//       const haystack: string[] = [
//         product.metadata.name,
//         product.metadata.description,
//         product.inputTokens?.[0]?.symbol,
//         product.outputToken?.symbol,
//         product.mechanics?.type,
//       ]
//         .filter(Boolean)
//         .map((v) => String(v).toLowerCase())

//       return haystack.some((text) => text.includes(lowerSearch))
//     })
//   }, [allProducts, search, tokenSymbol])

//   // Sort products by reward rate (highest first)
//   const sortedProducts = useMemo(() => {
//     return [...availableProducts].sort(
//       (a, b) => (b.rewardRate?.total || 0) - (a.rewardRate?.total || 0),
//     )
//   }, [availableProducts])

//   // Slice products for display (max 100)
//   const visibleProducts = useMemo(
//     () => sortedProducts.slice(0, Math.min(visibleProductCount, 100)),
//     [sortedProducts, visibleProductCount],
//   )

//   // Update show more handler
//   const handleShowMore = useCallback(() => {
//     setVisibleProductCount((prev) => Math.min(prev + 20, 100))
//   }, [])

//   // Determine if show more should be visible
//   const shouldShowMore = visibleProductCount < 100 && visibleProductCount < sortedProducts.length

//   // Don't render if network is not in allowed networks
//   if (!mappedNetwork || !allowedNetworks.includes(mappedNetwork)) {
//     return null
//   }

//   // Don't render if no products found (after filtering)
//   if (!isLoadingNetworkProducts && availableProducts.length === 0) {
//     return null
//   }

//   return (
//     <DiscoverTokenRow
//       tokenSymbol={tokenSymbol}
//       tokenLogoURI={tokenLogoURI}
//       networkId={networkId}
//       tokenId={tokenId}
//       products={visibleProducts}
//       onProductClick={onProductClick}
//       isPopup={isPopup}
//       isLoading={isLoadingNetworkProducts}
//       hasMoreProducts={shouldShowMore}
//       onShowMore={handleShowMore}
//     />
//   )
// }

export const EarnOnYourAssets: FC<{
  isPopup?: boolean
  search: string
}> = () =>
  // {
  // TODO
  //  isPopup = false, search
  //  }
  {
    useYieldxyzProviders() // preload providers (so their names and logos are available when expanding token rows)
    const { t } = useTranslation()
    // const { userTokens, isLoading } = useUserTokensWithYield()
    const navigate = useNavigate()
    // const remoteConfig = useRemoteConfig()

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
    // const allowedNetworks = useMemo(() => {
    //   const configuredNetworks = Object.keys(remoteConfig.earn?.yieldxyzNetworks || {})

    //   // If no networks are configured, use default fallback networks
    //   if (configuredNetworks.length === 0) {
    //     return ["ethereum", "base", "polygon", "arbitrum", "optimism"]
    //   }

    //   return configuredNetworks
    // }, [remoteConfig.earn?.yieldxyzNetworks])

    // Group tokens by yield network using custom hook
    // const tokensByNetwork = useTokensByYieldNetwork(
    //   userTokens,
    //   allowedNetworks,
    //   remoteConfig.earn?.yieldxyzNetworks || {
    //     // Fallback network mapping when remote config is empty
    //     ethereum: "1",
    //     base: "8453",
    //     polygon: "137",
    //     arbitrum: "42161",
    //     optimism: "10",
    //   },
    // )

    // Group tokens by network (sorting now happens in NetworkTokensGroup by APY)
    // Note: We don't filter tokens here based on search - we filter products later
    // This allows tokens to show up if they have products matching the search,
    // even if the token symbol itself doesn't match (same as DiscoverOpportunities)
    // const sortedTokensByNetwork = useMemo(() => {
    //   return Object.entries(tokensByNetwork).map(([network, tokens]) => ({
    //     network,
    //     tokens, // No sorting here, will be sorted in NetworkTokensGroup by APY
    //   }))
    // }, [tokensByNetwork])

    // const handleProductClick = useCallback(
    //   (product: YieldDto) => {
    //     // Find the token that matches this product
    //     const matchingToken = userTokens.find((token) =>
    //       product.inputTokens?.some(
    //         (inputToken) => inputToken.symbol?.toLowerCase() === token.symbol.toLowerCase(),
    //       ),
    //     )

    //     if (!matchingToken) return

    //     setSelectedProduct(product)
    //     setSelectedTokenId(matchingToken.tokenId)

    //     // Check if this product requires validator selection
    //     if (product?.mechanics?.requiresValidatorSelection) {
    //       if (IS_POPUP) {
    //         // Navigate to validator picker page in popup mode
    //         const params = new URLSearchParams({
    //           tokenId: matchingToken.tokenId,
    //           productId: product.id,
    //         })
    //         navigate(`/select-product/select-validator?${params.toString()}`)
    //       } else {
    //         // Show validator picker modal in dashboard mode
    //         setIsValidatorPickerOpen(true)
    //       }
    //       return
    //     }

    //     // Always show account picker (per user requirement)
    //     if (IS_POPUP) {
    //       // Navigate to account picker page in popup mode
    //       navigate(
    //         `/select-product/select-account?tokenId=${encodeURIComponent(matchingToken.tokenId)}&productId=${encodeURIComponent(product.id)}`,
    //       )
    //     } else {
    //       // Show account picker modal in dashboard mode
    //       setIsAccountPickerOpen(true)
    //     }
    //   },
    //   [navigate, userTokens],
    // )

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

    const { status, data: tokenOpportunities } = useOpportunitiesByTokenId()

    return (
      <div className="flex w-full flex-col gap-4 overflow-hidden">
        {tokenOpportunities?.map(({ tokenId, opportunities, bestApr, balances }) => (
          <TokenOpportunities
            key={tokenId}
            opportunities={opportunities}
            tokenId={tokenId}
            bestApr={bestApr}
            balances={balances}
            isLoading={status === "loading"}
          />
        ))}
        {status === "loading" && <TokenOpportunitiesShimmer />}
        {status === "success" && !tokenOpportunities?.length && (
          <div className="text-body-secondary bg-black-secondary rounded-sm py-10 text-center text-xs">
            {t("There are no yield opportunities available for your tokens")}
          </div>
        )}

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

const useOpportunitiesByTokenId = (): Loadable<
  {
    tokenId: string
    opportunities: YieldDto[]
    bestApr: number
    balances: Balances
  }[]
> => {
  const { selectedAccounts } = usePortfolioNavigation()
  const balances = useBalances()
  const opportunities = useYieldxyzOpportunities()

  // all token ids where the selected accounts have any balance
  const availableTokenIds = useMemo(() => {
    const accountIds = new Set(selectedAccounts.map((acc) => normalizeAddress(acc.address)))
    return uniq(
      balances.find((b) => accountIds.has(normalizeAddress(b.address))).each.map((b) => b.tokenId),
    ).sort()
  }, [balances, selectedAccounts])

  const { getYieldxyzTokenId } = useGetYieldxyzToken()

  const opportunitiesByTokenId = useMemo((): Record<TokenId, YieldDto[]> => {
    // keep only opportunities for which we have all input tokens
    const oppsByTokenId =
      opportunities.data
        ?.filter((o) => o.rewardRate.total) // a bunch are 0 reward while they are "under maintenance"
        .filter((opportunity) => {
          const inputTokenIds = opportunity.inputTokens
            ?.map((inputToken) => {
              const tokenId = getYieldxyzTokenId(inputToken)
              return availableTokenIds.includes(tokenId || "") ? tokenId : null
              // TODO check that at least one account owns all tokens, or its not a valid opportunity
            })
            .filter(Boolean) as string[]

          // check if all input token ids are in availableTokenIds
          return inputTokenIds.length === opportunity.inputTokens.length
        })
        .reduce<Record<TokenId, YieldDto[]>>((acc, opportunity) => {
          const inputTokenIds = opportunity.inputTokens
            ?.map((inputToken) => getYieldxyzTokenId(inputToken))
            .filter(isNotNil) as TokenId[]

          inputTokenIds.forEach((tokenId) => {
            if (!acc[tokenId]) acc[tokenId] = []
            acc[tokenId].push(opportunity)
          })

          return acc
        }, {}) || {}

    // for each token, sort opportunities by reward rate descending
    return Object.entries(oppsByTokenId).reduce(
      (acc, [tokenId, opps]) => {
        acc[tokenId as TokenId] = opps.sort(
          (a, b) => (b.rewardRate?.total || 0) - (a.rewardRate?.total || 0),
        )
        return acc
      },
      {} as Record<TokenId, YieldDto[]>,
    )
  }, [opportunities.data, getYieldxyzTokenId, availableTokenIds])

  const currency = useSelectedCurrency()

  const data = useMemo(() => {
    return Object.entries(opportunitiesByTokenId)
      .map(([tokenId, opportunities]) => ({
        tokenId,
        opportunities,
        bestApr: Math.max(...opportunities.map((opp) => opp.rewardRate.total * 100)),
        balances: balances.find({ tokenId }),
      }))
      .sort((a, b) => {
        const balance1 = a.balances.sum.fiat(currency).transferable
        const balance2 = b.balances.sum.fiat(currency).transferable
        return (balance2 || 0) - (balance1 || 0)
      })
  }, [opportunitiesByTokenId, balances, currency])

  return {
    ...opportunities,
    data,
  }
}

const TokenOpportunities: FC<{
  tokenId: TokenId
  opportunities: YieldDto[]
  bestApr: number
  balances: Balances
  isLoading?: boolean
}> = ({ tokenId, opportunities, bestApr, balances, isLoading }) => {
  const { t } = useTranslation()
  const token = useToken(tokenId)
  const network = useNetworkById(token?.networkId)
  const { isOpen, toggle } = useOpenClose()

  if (!token || !network) return null

  return (
    <div className="bg-grey-900 w-full overflow-hidden rounded">
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "hover:bg-grey-750 flex h-28 w-full items-center gap-6 overflow-hidden px-8",
          isOpen && "bg-grey-800",
        )}
      >
        <TokenLogo tokenId={tokenId} className="size-16" />
        <div className="text-body-secondary flex grow flex-col justify-center gap-2 text-left text-sm font-medium">
          <div className="">
            <span className="text-body font-bold">
              <TokenDisplaySymbol tokenId={tokenId} />
            </span>{" "}
            {token.name}
          </div>
          <div className="flex w-full items-center gap-2 overflow-hidden">
            <NetworkLogo networkId={token.networkId} className="shrink=0 size-8" />
            <NetworkName networkId={token.networkId} className="truncate" />
          </div>
        </div>
        <div className="text-body-inactive flex shrink-0 flex-col items-end justify-end gap-2 text-nowrap text-sm font-medium">
          <div className="text-body-secondary">
            <TokensAndFiat
              tokenId={tokenId}
              planck={balances.sum.planck.transferable}
              tokensClassName="text-body"
              fiatClassName=" text-sm font-medium"
            />
          </div>
          <div className={cn(isLoading && "animate-pulse")}>
            <Trans
              t={t}
              defaults="APY up to <Highlight>{{bestApr}}%</Highlight>"
              values={{ bestApr: bestApr.toFixed(2) }}
              components={{ Highlight: <span className="text-primary font-bold" /> }}
            />
          </div>
        </div>
        <ChevronRightIcon
          className={cn("size-10 shrink-0 transition-transform", isOpen && "rotate-90")}
        />
      </button>
      <div className={cn("flex w-full flex-col", isOpen ? "block" : "hidden")}>
        {isOpen &&
          opportunities.map((opportunity) => (
            <OpportunityRow key={opportunity.id} opportunity={opportunity} />
          ))}
      </div>
    </div>
  )
}

const OpportunityRow: FC<{ opportunity: YieldDto }> = ({ opportunity }) => {
  const { t } = useTranslation()
  //const { data: provider } = useYieldxyzProvider(opportunity.providerId)
  return (
    <button
      type="button"
      className="hover:bg-grey-750 flex h-28 w-full items-center gap-6 px-8 text-sm"
    >
      {/* <img className="bg-grey-500 size-16 rounded-full" src={opportunity.metadata.logoURI} alt="" /> */}
      <YieldxyzProviderLogo providerId={opportunity.providerId} className="size-16 shrink-0" />
      <div className="flex grow flex-col items-start justify-start gap-2">
        <div className="text-body">
          {opportunity.metadata.name} <EarnTypeBadge>{opportunity.mechanics?.type}</EarnTypeBadge>
        </div>
        <div className="flex items-center gap-4">
          {/* <span>{provider?.name}</span>
          <span className="text-body-disabled">{provider?.description}</span> */}
          <Metric icon={<UsersIcon />} tooltip={t("Number of unique holders")}>
            {opportunity.statistics?.uniqueUsers}
          </Metric>
          <Metric icon={<LockIcon />} tooltip={t("Total value locked")}>
            {Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              notation: "compact",
            }).format(Number(opportunity.statistics?.tvlUsd ?? 0))}
          </Metric>
        </div>
      </div>
      <div className="shrink-0 text-nowrap">
        {opportunity.rewardRate.rateType}:{" "}
        <span className="text-primary-500 font-bold">
          {(opportunity.rewardRate.total * 100).toFixed(2)}%
        </span>
      </div>
    </button>
  )
}

const Metric: FC<
  PropsWithChildren<{ icon: ReactNode; tooltip: ReactNode; className?: string }>
> = ({ children, icon, tooltip, className }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <div className={cn("inline-flex shrink-0 items-center gap-2", className)}>
        <div className="shrink-0 align-text-bottom font-medium">{icon}</div>
        <div>{children ?? t("N/A")}</div>
      </div>
    </TooltipTrigger>
    <TooltipContent>{tooltip}</TooltipContent>
  </Tooltip>
)

const TokenOpportunitiesShimmer = () => (
  <div className="bg-grey-900 flex h-28 items-center gap-6 rounded px-8">
    <div className="bg-grey-700 size-16 shrink-0 animate-pulse rounded-full"></div>
    <div className="flex grow flex-col justify-center gap-2 text-left text-sm font-medium">
      <div className="flex">
        <div className="bg-grey-700 text-grey-700 rounded-xs animate-pulse font-bold">
          XXXX Token Name
        </div>
      </div>
      <div>
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="bg-grey-700 size-8 animate-pulse rounded-full"></div>
          <div className="bg-grey-700 text-grey-700 rounded-xs animate-pulse truncate">
            Network Name
          </div>
        </div>
      </div>
    </div>
    <div className="flex shrink-0 flex-col items-end justify-end gap-2 text-nowrap text-sm font-medium">
      <div className="text-grey-700 bg-grey-700 rounded-xs animate-pulse">0.0000 XXX ($0.00)</div>
      <div className="text-grey-700 bg-grey-700 rounded-xs animate-pulse">APY up to 00.00%</div>
    </div>
    <ChevronRightIcon className="invisible size-10 shrink-0" />
  </div>
)
