import { useMemo } from "react"

import { useSwap } from "../SwapProvider"
import { useFastBalance } from "../swaps-port/useFastBalance"
import { SwapApproveErc20 } from "./SwapApproveErc20"
import { SwapConfirm } from "./SwapConfirm"
import { SwapForm } from "./SwapForm"
import { SwapHeader } from "./SwapHeader"

export const SwapTokensWizard = () => {
  const { swapView, fromAsset, fromEvmAddress, fromSubstrateAddress, quotesLoadable } = useSwap()

  const fastBalance = useFastBalance(
    useMemo(() => {
      if (!fromAsset) return undefined

      if (fromAsset.networkType === "evm") {
        if (!fromEvmAddress) return undefined
        return {
          type: "evm",
          address: fromEvmAddress,
          networkId: +fromAsset.chainId,
          tokenAddress: fromAsset.contractAddress as `0x${string}`,
        }
      }

      if (fromAsset.networkType === "substrate") {
        if (!fromSubstrateAddress) return undefined
        return {
          type: "substrate",
          address: fromSubstrateAddress,
          chainId: fromAsset.chainId.toString(),
          assetHubAssetId: fromAsset.assetHubAssetId,
        }
      }

      return undefined
    }, [fromAsset, fromEvmAddress, fromSubstrateAddress])
  )

  // keep quotes loaded when switching between swap views
  void quotesLoadable

  return (
    <div id="SwapTokensModalDialog" className="relative flex h-full w-full flex-col gap-4">
      <SwapHeader />

      {(swapView === "form" || swapView === "approve-recipient") && (
        <SwapForm fastBalance={fastBalance} approveRecipient={swapView === "approve-recipient"} />
      )}
      {swapView === "approve-erc20" && <SwapApproveErc20 />}
      {swapView === "confirm" && <SwapConfirm fastBalance={fastBalance} />}
    </div>
  )
}
