import { useAtomValue } from "jotai"
import { useMemo } from "react"

import { fromAssetAtom } from "../swap-modules/common.swap-module"
import { swapViewAtom } from "../swaps-port/swapViewAtom"
import { useFastBalance } from "../swaps-port/useFastBalance"
import { swapQuotesAtom, useFromAccount } from "../swaps.api"
import { SwapApproveErc20 } from "./SwapApproveErc20"
import { SwapConfirm } from "./SwapConfirm"
import { SwapForm } from "./SwapForm"
import { SwapHeader } from "./SwapHeader"

export const SwapTokensWizard = () => {
  const swapView = useAtomValue(swapViewAtom)

  const fromAsset = useAtomValue(fromAssetAtom)
  const { fromEvmAddress, fromSubstrateAddress } = useFromAccount()
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
    }, [fromAsset, fromEvmAddress, fromSubstrateAddress]),
  )

  // START: some things to keep loaded when switching between swaps views
  useAtomValue(swapQuotesAtom)
  // END: some things to keep loaded when switching between swaps views

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
