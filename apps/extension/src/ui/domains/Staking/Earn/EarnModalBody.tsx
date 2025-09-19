/* eslint-disable no-console */
import { TokenId } from "@talismn/chaindata-provider"
import { YieldProduct } from "extension-core"
import { FC, useState } from "react"
import { useNavigate } from "react-router-dom"

import { usePortfolioNavigation } from "@ui/domains/Portfolio/usePortfolioNavigation"
import { useNetworkById, useToken } from "@ui/state"
import { useYieldProducts } from "@ui/state/yield"
import { IS_POPUP } from "@ui/util/constants"

import { EarnAccountPicker } from "./components/EarnAccountPicker"
import { ProductList } from "./components/ProductList"
import { TokenDetails } from "./components/TokenDetails"
import { useEarnWizard, useSetEarnWizardAccount } from "./hooks/useEarnWizard"

interface EarnModalBodyProps {
  tokenId: TokenId
}

export const EarnModalBody: FC<EarnModalBodyProps> = ({ tokenId }) => {
  const token = useToken(tokenId)
  const network = useNetworkById(token?.networkId)
  const { selectedAccount } = usePortfolioNavigation()
  const { selectedAccountAddress } = useEarnWizard()
  const setEarnWizardAccount = useSetEarnWizardAccount()
  const navigate = useNavigate()

  const [isAccountPickerOpen, setIsAccountPickerOpen] = useState(false)

  // Fetch yield products filtered by token symbol
  const {
    data: yieldProducts = [],
    isLoading,
    error,
  } = useYieldProducts({
    tokenId,
    tokenSymbol: token?.symbol,
    networkName: network?.platform,
  })

  const handleProductClick = (product: YieldProduct) => {
    // Check if we have a selected account from portfolio or earn wizard
    const currentAccount = selectedAccountAddress || selectedAccount?.address

    if (!currentAccount) {
      // No account selected, show account picker
      if (IS_POPUP) {
        // Navigate to account picker page in popup mode
        navigate(`/earn/select-account?tokenId=${encodeURIComponent(tokenId)}`)
      } else {
        // Show modal in dashboard mode
        setIsAccountPickerOpen(true)
      }
      return
    }

    // eslint-disable-next-line no-console
    console.log("Product clicked:", product, tokenId, "Account:", currentAccount)
    // TODO: Navigate to product details or start earning process
  }

  const handleAccountSelect = (address: string) => {
    setEarnWizardAccount(address)
    setIsAccountPickerOpen(false)
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
    </>
  )
}
