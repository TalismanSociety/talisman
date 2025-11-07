import { TokenId } from "@talismn/chaindata-provider"
import { ValidatorDto, YieldDto } from "extension-core"
import { log } from "extension-shared"
import { FC, useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"

import { usePortfolioNavigation } from "@ui/domains/Portfolio/usePortfolioNavigation"
import { useNetworkById, useToken } from "@ui/state"
import { useInfiniteYieldProductsForToken } from "@ui/state/yield"
import { IS_POPUP } from "@ui/util/constants"

import { ConfirmDepositModal } from "../.."
import { DepositModal } from "../../DepositModal"
import {
  useEarnWizard,
  useResetEarnWizard,
  useSetEarnWizardAccount,
} from "../../hooks/useEarnWizard"
import { mapNetworkToYieldNetwork } from "../../utils/networkMapping"
import { getTokenAddress } from "../../utils/tokenUtils"
import { EarnAccountPicker } from "../EarnAccountPicker"
import { ProductList } from "../ProductList"
import { TokenDetails } from "../TokenDetails"
import { ValidatorPicker } from "../ValidatorPicker"

interface ProductSelectionModalBodyProps {
  tokenId: TokenId
}

export const ProductSelectionModalBody: FC<ProductSelectionModalBodyProps> = ({ tokenId }) => {
  const token = useToken(tokenId)
  const network = useNetworkById(token?.networkId)
  const { selectedAccount } = usePortfolioNavigation()
  const { selectedAccountAddress, productId, validatorAddress, isAddToPositionFlow } =
    useEarnWizard()
  const setEarnWizardAccount = useSetEarnWizardAccount()
  const reset = useResetEarnWizard()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [isAccountPickerOpen, setIsAccountPickerOpen] = useState(false)
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [isValidatorPickerOpen, setIsValidatorPickerOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<YieldDto | null>(null)
  const [selectedValidatorAddress, setSelectedValidatorAddress] = useState<string | null>(null)
  const [visibleProductCount, setVisibleProductCount] = useState(20)

  // In popup mode, use the portfolio navigation system to get the selected account
  const portfolioAccount = usePortfolioNavigation().selectedAccount

  const initialPopupAccount = useMemo(() => {
    if (!IS_POPUP) return undefined

    // First try to get account from URL params (for direct navigation)
    const accountFromParams = searchParams.get("account")
    if (accountFromParams) return accountFromParams

    // Then try portfolio navigation (for earn button clicks)
    if (portfolioAccount?.address) return portfolioAccount.address

    // Fallback to earn wizard state
    if (selectedAccountAddress) return selectedAccountAddress

    return selectedAccount?.address
  }, [searchParams, portfolioAccount?.address, selectedAccount?.address, selectedAccountAddress])

  useEffect(() => {
    if (!IS_POPUP) return

    if (initialPopupAccount && initialPopupAccount !== selectedAccountAddress) {
      setEarnWizardAccount(initialPopupAccount)
    }
  }, [initialPopupAccount, selectedAccountAddress, setEarnWizardAccount])

  // Get the mapped network name
  const mappedNetworkName = mapNetworkToYieldNetwork(network)

  // Get token address if available, fallback to symbol
  const tokenIdentifier = useMemo(() => {
    const address = getTokenAddress(token)
    return address || token?.symbol || ""
  }, [token])

  // Fetch yield products with infinite pagination
  const { data, isLoading, error } = useInfiniteYieldProductsForToken(
    tokenIdentifier,
    mappedNetworkName || undefined,
  )

  // Flatten all pages and filter for exact token match
  const allYieldProducts = useMemo(() => {
    const allProducts = data?.pages.flat() || []
    // Filter out products that don't match the requested inputToken exactly
    return allProducts.filter((product) =>
      product.inputTokens?.some((inputToken) => {
        const symbol = inputToken.symbol?.toLowerCase()
        const address = inputToken.address?.toLowerCase()
        const identifier = tokenIdentifier.toLowerCase()

        // Match by address first if both have addresses, then fallback to symbol
        if (address && identifier.startsWith("0x")) {
          return address === identifier
        }
        return symbol === identifier
      }),
    )
  }, [data, tokenIdentifier])

  // Handle pre-selected product (from Add to Position flow)
  useEffect(() => {
    if (!productId || !isAddToPositionFlow || !allYieldProducts.length) return

    // If product is pre-selected, check if validator selection is needed
    const product = allYieldProducts.find((p) => p.id === productId)
    if (product?.mechanics?.requiresValidatorSelection) {
      // Product requires validator selection - always show validator picker first
      if (IS_POPUP) {
        // Navigate to validator picker page in popup mode
        const params = new URLSearchParams({
          tokenId,
          productId,
        })
        // Include validatorAddress if it exists (for pre-selection)
        if (validatorAddress) {
          params.set("validatorAddress", validatorAddress)
        }
        navigate(`/select-product/select-validator?${params.toString()}`)
      } else {
        // Show validator picker modal in dashboard mode
        setIsValidatorPickerOpen(true)
      }
    } else {
      // No validator selection needed - go directly to account selection
      if (IS_POPUP) {
        // Navigate to account selection page in popup mode
        const params = new URLSearchParams({
          tokenId,
          productId,
        })
        navigate(`/select-product/select-account?${params.toString()}`)
      } else {
        // Open account picker modal in dashboard mode
        setIsAccountPickerOpen(true)
      }
    }

    // Clear the Add to Position flow flag after navigation
    reset({ tokenId, productId, validatorAddress, isAddToPositionFlow: false })
  }, [productId, tokenId, validatorAddress, navigate, allYieldProducts, isAddToPositionFlow, reset])

  // Set the selected product when productId is pre-selected
  useEffect(() => {
    if (!productId || !allYieldProducts.length) return

    // Find the product by ID
    const product = allYieldProducts.find((p) => p.id === productId)
    if (product) {
      setSelectedProduct(product)
      if (validatorAddress) {
        setSelectedValidatorAddress(validatorAddress)
      }
    }
  }, [productId, allYieldProducts, validatorAddress])

  // Slice products for display (max 100)
  const visibleYieldProducts = useMemo(
    () => allYieldProducts.slice(0, Math.min(visibleProductCount, 100)),
    [allYieldProducts, visibleProductCount],
  )

  // Update show more handler
  const handleShowMore = useCallback(() => {
    setVisibleProductCount((prev) => Math.min(prev + 20, 100))
  }, [])

  // Determine if show more should be visible
  const shouldShowMore = visibleProductCount < 100 && visibleProductCount < allYieldProducts.length

  const handleProductClick = (product: YieldDto) => {
    // Check if we have a selected account from portfolio or earn wizard
    const currentAccount = IS_POPUP
      ? initialPopupAccount
      : selectedAccountAddress || selectedAccount?.address

    // Check if this product requires validator selection
    if (product?.mechanics?.requiresValidatorSelection) {
      // Product requires validator selection
      setSelectedProduct(product)

      if (IS_POPUP) {
        // Navigate to validator picker page in popup mode with account if available
        const params = new URLSearchParams({
          tokenId,
          productId: product.id,
        })
        if (currentAccount) {
          params.set("account", currentAccount)
        }
        navigate(`/select-product/select-validator?${params.toString()}`)
      } else {
        // Show validator picker modal in dashboard mode
        setIsValidatorPickerOpen(true)
      }
      return
    }

    if (!currentAccount) {
      // No account selected
      if (IS_POPUP) {
        // In popup mode, navigate to account picker first
        navigate(
          `/select-product/select-account?tokenId=${encodeURIComponent(tokenId)}&productId=${encodeURIComponent(product.id)}`,
        )
        return
      }
      // Show account picker (dashboard mode only)
      setSelectedProduct(product)
      setIsAccountPickerOpen(true)
      return
    }

    // Navigate to deposit amount page with all required parameters
    const params = new URLSearchParams({
      account: currentAccount,
      tokenId,
      productId: product.id,
    })

    if (IS_POPUP) {
      navigate(`/select-product/deposit/amount?${params.toString()}`)
    } else {
      // Open deposit modal in dashboard mode
      setSelectedProduct(product)
      setIsDepositModalOpen(true)
    }
  }

  const handleValidatorSelect = (validator: ValidatorDto) => {
    setIsValidatorPickerOpen(false)
    setSelectedValidatorAddress(validator.address)

    // Check if we have a selected account
    const currentAccount = IS_POPUP
      ? initialPopupAccount
      : selectedAccountAddress || selectedAccount?.address

    // Get the current product (either from state or pre-selected)
    const currentProduct = selectedProduct || allYieldProducts.find((p) => p.id === productId)

    if (!currentAccount) {
      // No account selected, show account picker
      if (IS_POPUP) {
        navigate(
          `/select-product/select-account?tokenId=${encodeURIComponent(tokenId)}&productId=${encodeURIComponent(currentProduct?.id || "")}&validatorAddress=${encodeURIComponent(validator.address)}`,
        )
        return
      }
      setIsAccountPickerOpen(true)
    } else {
      // Account is selected, go directly to deposit modal/page
      const params = new URLSearchParams({
        account: currentAccount,
        tokenId,
        productId: currentProduct?.id || "",
        validatorAddress: validator.address,
      })

      if (IS_POPUP) {
        navigate(`/select-product/deposit/amount?${params.toString()}`)
      } else {
        setIsDepositModalOpen(true)
      }
    }
  }

  const handleAccountSelect = (address: string) => {
    setEarnWizardAccount(address)
    setIsAccountPickerOpen(false)

    // If we have a product selected (either from state or pre-selected), open deposit modal
    if (selectedProduct || productId) {
      const currentProduct = selectedProduct || allYieldProducts.find((p) => p.id === productId)

      if (currentProduct) {
        // Check if this product requires validator selection
        if (
          currentProduct.mechanics?.requiresValidatorSelection &&
          !selectedValidatorAddress &&
          !validatorAddress
        ) {
          // This shouldn't happen - validator should be selected first
          log.error("Account selected for validator-required product but no validator selected")
          return
        }

        // Navigate to deposit amount page with all parameters
        const params = new URLSearchParams({
          account: address,
          tokenId,
          productId: currentProduct.id,
        })

        // Add validatorAddress if it exists
        const currentValidatorAddress = selectedValidatorAddress || validatorAddress
        if (currentValidatorAddress) {
          params.set("validatorAddress", currentValidatorAddress)
        }

        if (IS_POPUP) {
          navigate(`/select-product/deposit/amount?${params.toString()}`)
        } else {
          // Open deposit modal in dashboard mode
          setIsDepositModalOpen(true)
        }
      }
    }
  }

  return (
    <>
      {/* Only show product selection UI if not in Add to Position flow */}
      {!isAddToPositionFlow && (
        <div className="flex h-full flex-col gap-4 overflow-hidden">
          <TokenDetails tokenId={tokenId} tokenSymbol={token?.symbol} networkId={network?.id} />
          <ProductList
            products={visibleYieldProducts}
            tokenId={tokenId}
            isLoading={isLoading}
            error={error}
            onProductClick={handleProductClick}
            hasMoreProducts={shouldShowMore}
            onShowMore={handleShowMore}
          />
        </div>
      )}

      <ValidatorPicker
        isOpen={isValidatorPickerOpen}
        yieldId={selectedProduct?.id || ""}
        onDismiss={() => {
          setIsValidatorPickerOpen(false)
          setSelectedProduct(null)
          setSelectedValidatorAddress(null)
        }}
        onSelect={handleValidatorSelect}
      />

      <EarnAccountPicker
        isOpen={isAccountPickerOpen}
        tokenId={tokenId}
        onDismiss={() => setIsAccountPickerOpen(false)}
        onSelect={handleAccountSelect}
      />

      {selectedProduct && (
        <DepositModal
          isOpen={isDepositModalOpen}
          onClose={() => {
            setIsDepositModalOpen(false)
            setSelectedProduct(null)
            setSelectedValidatorAddress(null)
          }}
          onNext={() => {
            // Close deposit modal and open confirm modal
            setIsDepositModalOpen(false)
            setIsConfirmModalOpen(true)
          }}
          account={selectedAccountAddress || selectedAccount?.address || ""}
          tokenId={tokenId}
          productId={selectedProduct.id}
          validatorAddress={selectedValidatorAddress || undefined}
        />
      )}

      {selectedProduct && (
        <ConfirmDepositModal
          isOpen={isConfirmModalOpen}
          onClose={() => {
            setIsConfirmModalOpen(false)
            setSelectedProduct(null)
          }}
          account={selectedAccountAddress || selectedAccount?.address || ""}
          tokenId={tokenId}
          productId={selectedProduct.id}
        />
      )}
    </>
  )
}
