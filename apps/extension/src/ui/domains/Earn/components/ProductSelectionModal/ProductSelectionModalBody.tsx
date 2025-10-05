import { TokenId } from "@talismn/chaindata-provider"
import { YieldProduct, YieldValidator } from "extension-core"
import { log } from "extension-shared"
import { FC, useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"

import { usePortfolioNavigation } from "@ui/domains/Portfolio/usePortfolioNavigation"
import { useNetworkById, useToken } from "@ui/state"
import { useYieldProducts } from "@ui/state/yield"
import { IS_POPUP } from "@ui/util/constants"

import { ConfirmDepositModal } from "../../ConfirmDepositModal"
import { DepositModal } from "../../DepositModal"
import { useEarnWizard, useSetEarnWizardAccount } from "../../hooks/useEarnWizard"
import { mapNetworkToYieldNetwork } from "../../utils/networkMapping"
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
  const { selectedAccountAddress } = useEarnWizard()
  const setEarnWizardAccount = useSetEarnWizardAccount()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [isAccountPickerOpen, setIsAccountPickerOpen] = useState(false)
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [isValidatorPickerOpen, setIsValidatorPickerOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<YieldProduct | null>(null)
  const [selectedValidatorAddress, setSelectedValidatorAddress] = useState<string | null>(null)

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

  // Fetch yield products filtered by token symbol
  const {
    data: yieldProducts = [],
    isLoading,
    error,
  } = useYieldProducts({
    tokenId,
    tokenSymbol: token?.symbol,
    networkName: mappedNetworkName || undefined,
  })

  const handleProductClick = (product: YieldProduct) => {
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

  const handleValidatorSelect = (validator: YieldValidator) => {
    setIsValidatorPickerOpen(false)
    setSelectedValidatorAddress(validator.address)

    // Check if we have a selected account
    const currentAccount = IS_POPUP
      ? initialPopupAccount
      : selectedAccountAddress || selectedAccount?.address

    if (!currentAccount) {
      // No account selected, show account picker
      if (IS_POPUP) {
        navigate(
          `/select-product/select-account?tokenId=${encodeURIComponent(tokenId)}&productId=${encodeURIComponent(selectedProduct?.id || "")}&validatorAddress=${encodeURIComponent(validator.address)}`,
        )
        return
      }
      setIsAccountPickerOpen(true)
    } else {
      // Account is selected, go directly to deposit modal/page
      const params = new URLSearchParams({
        account: currentAccount,
        tokenId,
        productId: selectedProduct?.id || "",
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

    // If we have a product selected, open deposit modal
    if (selectedProduct) {
      // Check if this product requires validator selection
      if (selectedProduct.mechanics?.requiresValidatorSelection && !selectedValidatorAddress) {
        // This shouldn't happen - validator should be selected first
        log.error("Account selected for validator-required product but no validator selected")
        return
      }

      // Open deposit modal with validator address if available
      setIsDepositModalOpen(true)
    } else {
      // Fallback for URL params (popup mode)
      const urlParams = new URLSearchParams(window.location.search)
      const productId = urlParams.get("productId")
      const validatorAddress = urlParams.get("validatorAddress")

      if (productId) {
        const params = new URLSearchParams({
          account: address,
          tokenId,
          productId,
        })

        // Add validatorAddress if it exists
        if (validatorAddress) {
          params.set("validatorAddress", validatorAddress)
        }

        if (IS_POPUP) {
          navigate(`/select-product/deposit/amount?${params.toString()}`)
        }
      }
    }
  }

  return (
    <>
      <div className="flex h-full flex-col gap-4 overflow-hidden">
        <TokenDetails tokenId={tokenId} tokenSymbol={token?.symbol} networkId={network?.id} />
        <ProductList
          products={yieldProducts}
          tokenId={tokenId}
          isLoading={isLoading}
          error={error}
          onProductClick={handleProductClick}
        />
      </div>

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
