// biome-ignore-all lint/suspicious/noExplicitAny: legacy

import { getExtensionPublicClient } from "@ui/domains/Ethereum/usePublicClient"
import { useNetworks } from "@ui/state/chaindata"
import { useEffect, useMemo, useState } from "react"
import { encodeFunctionData, erc20Abi } from "viem"
import type { Chain as ViemChain } from "viem/chains"

import type {
  ApprovalInfo,
  BaseQuote,
  SwappableAssetWithDecimals,
} from "../swap-modules/common.swap-module"
import type { swapModules } from "../swaps.api"
import { allEvmChains } from "../swaps-port/allEvmChains"
import type { Decimal } from "../swaps-port/Decimal"
import type { Loadable } from "../types"

/**
 * Manages ERC20 approval state for the selected swap module.
 * Returns approval data (if approval is needed), loading state, and the prepared approval tx.
 */
export const useSwapErc20Approval = (params: {
  selectedModule: (typeof swapModules)[number] | undefined
  fromAsset: SwappableAssetWithDecimals | null
  toAsset: SwappableAssetWithDecimals | null
  fromAmount: Decimal
  fromAddress: string | null
  toAddress: string | null
  selectedSubProtocol: string | undefined
  selectedQuote: { quote: Loadable<BaseQuote | null>; fees?: number } | null
  approvalCounter: number
}) => {
  const {
    selectedModule,
    fromAsset,
    toAsset,
    fromAmount,
    fromAddress,
    toAddress,
    selectedSubProtocol,
    selectedQuote,
  } = params

  const evmNetworks = useNetworks({ platform: "ethereum" })

  // Get approval info from module (synchronous)
  const approvalInfo: ApprovalInfo = useMemo(() => {
    if (!selectedModule?.getApprovalInfo) return null
    if (!fromAsset || !toAsset) return null

    const quoteData = selectedQuote?.quote.state === "hasData" ? selectedQuote.quote.data : null
    if (!quoteData) return null

    return selectedModule.getApprovalInfo({
      fromAsset,
      toAsset,
      fromAmount,
      fromAddress,
      toAddress,
      selectedSubProtocol,
      quoteData,
    })
  }, [
    selectedModule,
    fromAsset,
    toAsset,
    fromAmount,
    fromAddress,
    toAddress,
    selectedSubProtocol,
    selectedQuote,
  ])

  // Check on-chain allowance and determine if approval is needed
  const [approvalState, setApprovalState] = useState<
    Loadable<(ApprovalInfo & { chain: ViemChain }) | null>
  >({ state: "loading" })

  // biome-ignore lint/correctness/useExhaustiveDependencies: approvalCounter forces re-check
  useEffect(() => {
    if (!approvalInfo) {
      setApprovalState({ state: "hasData", data: null })
      return
    }

    let cancelled = false
    setApprovalState({ state: "loading" })

    const run = async () => {
      try {
        const chain: ViemChain | undefined = Object.values(allEvmChains).find(
          (c) => c?.id === approvalInfo.chainId
        )
        if (!chain) {
          setApprovalState({ state: "hasData", data: null })
          return
        }

        const network = evmNetworks.find((n) => n.id.toString() === approvalInfo.chainId.toString())
        if (!network) {
          setApprovalState({ state: "hasData", data: null })
          return
        }

        const client = getExtensionPublicClient(network as any)
        if (!client) {
          setApprovalState({ state: "hasData", data: null })
          return
        }

        const allowance = await client.readContract({
          abi: erc20Abi,
          address: approvalInfo.tokenAddress as `0x${string}`,
          functionName: "allowance",
          args: [
            approvalInfo.fromAddress as `0x${string}`,
            approvalInfo.contractAddress as `0x${string}`,
          ],
        })

        if (cancelled) return

        if (allowance >= approvalInfo.amount) {
          setApprovalState({ state: "hasData", data: null })
        } else {
          setApprovalState({ state: "hasData", data: { ...approvalInfo, chain } })
        }
      } catch (error) {
        if (cancelled) return
        setApprovalState({ state: "hasError", error })
      }
    }
    run()

    return () => {
      cancelled = true
    }
  }, [approvalInfo, evmNetworks, params.approvalCounter])

  // Prepare approval tx
  const approveTxLoadable: Loadable<any> = useMemo(() => {
    if (approvalState.state !== "hasData" || !approvalState.data) {
      return { state: "hasError", error: new Error("Approval not ready yet") }
    }

    const data = encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [approvalState.data.contractAddress as `0x${string}`, approvalState.data.amount],
    })

    return {
      state: "hasData",
      data: {
        chain: approvalState.data.chain,
        to: approvalState.data.tokenAddress as `0x${string}`,
        data,
        value: 0n,
        account: fromAddress as `0x${string}`,
      },
    }
  }, [approvalState, fromAddress])

  const approvalData = useMemo(
    () => (approvalState.state === "hasData" && approvalState.data) || null,
    [approvalState]
  )

  return {
    data: approvalData,
    loading: approvalState.state === "loading",
    approveTxLoadable,
  }
}
