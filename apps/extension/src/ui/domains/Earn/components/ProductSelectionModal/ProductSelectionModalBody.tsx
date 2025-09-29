/* eslint-disable no-console */
import { TokenId } from "@talismn/chaindata-provider"
import { YieldProduct } from "extension-core"
import { FC, useState } from "react"
import { useNavigate } from "react-router-dom"

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

  const [isAccountPickerOpen, setIsAccountPickerOpen] = useState(false)
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<YieldProduct | null>(null)

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
    const currentAccount = selectedAccountAddress || selectedAccount?.address

    if (!currentAccount) {
      // No account selected, show account picker
      if (IS_POPUP) {
        // Navigate to account picker page in popup mode
        navigate(
          `/earn/select-account?tokenId=${encodeURIComponent(tokenId)}&productId=${encodeURIComponent(product.id)}`,
        )
      } else {
        // Show modal in dashboard mode
        setSelectedProduct(product)
        setIsAccountPickerOpen(true)
      }
      return
    }

    // Navigate to deposit amount page with all required parameters
    const params = new URLSearchParams({
      account: currentAccount,
      tokenId,
      productId: product.id,
    })

    if (IS_POPUP) {
      navigate(`/earn/deposit/amount?${params.toString()}`)
    } else {
      // Open deposit modal in dashboard mode
      setSelectedProduct(product)
      setIsDepositModalOpen(true)
    }
  }

  const handleAccountSelect = (address: string) => {
    setEarnWizardAccount(address)
    setIsAccountPickerOpen(false)

    // If we have a product selected, open deposit modal
    if (selectedProduct) {
      setIsDepositModalOpen(true)
    } else {
      // Fallback for URL params (popup mode)
      const urlParams = new URLSearchParams(window.location.search)
      const productId = urlParams.get("productId")

      if (productId) {
        const params = new URLSearchParams({
          account: address,
          tokenId,
          productId,
        })

        if (IS_POPUP) {
          navigate(`/earn/deposit/amount?${params.toString()}`)
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
          }}
          onNext={() => {
            // Close deposit modal and open confirm modal
            setIsDepositModalOpen(false)
            setIsConfirmModalOpen(true)
          }}
          account={selectedAccountAddress || selectedAccount?.address || ""}
          tokenId={tokenId}
          productId={selectedProduct.id}
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
