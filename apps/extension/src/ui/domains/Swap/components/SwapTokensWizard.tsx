import { useMemo } from "react"

import { useSwap } from "../SwapProvider"
import { useFastBalance } from "../swaps-port/useFastBalance"
import { SwapApproveErc20 } from "./SwapApproveErc20"
import { SwapConfirm } from "./SwapConfirm"
import { SwapForm } from "./SwapForm"
import { SwapFormShimmer } from "./SwapFormShimmer"
import { SwapHeader } from "./SwapHeader"

export const SwapTokensWizard = () => {
  const { swapView, fromAsset, fromAddress, isInitializing } = useSwap()

  const fastBalance = useFastBalance(
    useMemo(() => {
      if (!fromAsset || !fromAddress) return undefined

      if (fromAsset.networkType === "evm") {
        return {
          type: "evm",
          address: fromAddress,
          networkId: +fromAsset.chainId,
          tokenAddress: fromAsset.contractAddress as `0x${string}`,
        }
      }

      if (fromAsset.networkType === "substrate") {
        return {
          type: "substrate",
          address: fromAddress,
          chainId: fromAsset.chainId.toString(),
          assetHubAssetId: fromAsset.assetHubAssetId,
        }
      }

      return undefined
    }, [fromAsset, fromAddress])
  )

  return (
    <div className="relative flex h-full w-full flex-col gap-4">
      <SwapHeader />

      {(swapView === "form" || swapView === "approve-recipient") &&
        (isInitializing ? (
          <SwapFormShimmer />
        ) : (
          <SwapForm fastBalance={fastBalance} approveRecipient={swapView === "approve-recipient"} />
        ))}
      {swapView === "approve-erc20" && <SwapApproveErc20 />}
      {swapView === "confirm" && <SwapConfirm fastBalance={fastBalance} />}
    </div>
  )
}
