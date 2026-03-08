import { provideContext } from "@ui/util/provideContext"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { loadable } from "jotai/utils"
import { useCallback, useMemo } from "react"

import type { SwapInit } from "./hooks/useSwapTokensModal"
import {
  fromAddressAtom,
  fromAmountAtom,
  fromAssetAtom,
  fromEvmAddressAtom,
  fromSubstrateAddressAtom,
  quoteSortingAtom,
  resetSwapFormAtom,
  selectedProtocolAtom,
  selectedSubProtocolAtom,
  swapQuoteRefresherAtom,
  toAddressAtom,
  toAssetAtom,
  toBtcAddressAtom,
  toEvmAddressAtom,
  toSubstrateAddressAtom,
} from "./swap-modules/common.swap-module"
import {
  approvalCounterAtom,
  fromAssetsAtom,
  safeTokensSetAtom,
  selectedQuoteAtom,
  selectedSwapModuleAtom,
  sortedQuotesAtom,
  swapQuotesAtom,
  toAmountAtom,
  toAssetsAtom,
  tokenTabAtom,
  useFromAccount,
  useReverse,
  useSetToAddress,
  useSwapErc20Approval,
} from "./swaps.api"
import { swapViewAtom } from "./swaps-port/swapViewAtom"

export type SwapView = "form" | "approve-recipient" | "approve-erc20" | "confirm"

type SwapProviderProps = {
  stateInit: SwapInit | null
}

const useSwapProviderContext = ({ stateInit }: SwapProviderProps) => {
  // -- View --
  const [swapView, setSwapView] = useAtom(swapViewAtom)

  // -- Core form state --
  const [fromAsset, setFromAsset] = useAtom(fromAssetAtom)
  const [toAsset, setToAsset] = useAtom(toAssetAtom)
  const [fromAmount, setFromAmount] = useAtom(fromAmountAtom)
  const [selectedProtocol, setSelectedProtocol] = useAtom(selectedProtocolAtom)
  const [selectedSubProtocol, setSelectedSubProtocol] = useAtom(selectedSubProtocolAtom)
  const [quoteSorting, setQuoteSorting] = useAtom(quoteSortingAtom)

  // -- Address state --
  const [fromEvmAddress, setFromEvmAddress] = useAtom(fromEvmAddressAtom)
  const [fromSubstrateAddress, setFromSubstrateAddress] = useAtom(fromSubstrateAddressAtom)
  const [toEvmAddress, setToEvmAddress] = useAtom(toEvmAddressAtom)
  const [toSubstrateAddress, setToSubstrateAddress] = useAtom(toSubstrateAddressAtom)
  const [toBtcAddress, setToBtcAddress] = useAtom(toBtcAddressAtom)
  const fromAddress = useAtomValue(fromAddressAtom)
  const toAddress = useAtomValue(toAddressAtom)

  // -- Token tab --
  const [tokenTab, setTokenTab] = useAtom(tokenTabAtom)

  // -- Actions --
  const resetForm = useSetAtom(resetSwapFormAtom)
  const setQuoteRefresher = useSetAtom(swapQuoteRefresherAtom)
  const refreshQuotes = useCallback(() => setQuoteRefresher(Date.now()), [setQuoteRefresher])
  const [approvalCounter, setApprovalCounter] = useAtom(approvalCounterAtom)
  const incrementApprovalCounter = useCallback(
    () => setApprovalCounter((c) => c + 1),
    [setApprovalCounter]
  )

  // -- Derived async state (loadable to avoid Suspense) --
  const fromAssetsLoadable = useAtomValue(loadable(fromAssetsAtom))
  const toAssetsLoadable = useAtomValue(loadable(toAssetsAtom))
  // swapQuotesAtom is already wrapped in loadable
  const quotesLoadable = useAtomValue(swapQuotesAtom)
  const sortedQuotesLoadable = useAtomValue(loadable(sortedQuotesAtom))
  const selectedQuoteLoadable = useAtomValue(loadable(selectedQuoteAtom))
  const selectedModuleLoadable = useAtomValue(loadable(selectedSwapModuleAtom))
  const toAmountLoadable = useAtomValue(loadable(toAmountAtom))
  const safeTokensLoadable = useAtomValue(loadable(safeTokensSetAtom))

  // -- Side-effect hooks (run in provider so they're active for all views) --
  const fromAccountInfo = useFromAccount()
  useSetToAddress()
  const reverse = useReverse()
  const erc20Approval = useSwapErc20Approval()

  return useMemo(
    () => ({
      // View
      swapView,
      setSwapView,

      // Form state
      fromAsset,
      setFromAsset,
      toAsset,
      setToAsset,
      fromAmount,
      setFromAmount,
      selectedProtocol,
      setSelectedProtocol,
      selectedSubProtocol,
      setSelectedSubProtocol,
      quoteSorting,
      setQuoteSorting,

      // Addresses
      fromEvmAddress,
      setFromEvmAddress,
      fromSubstrateAddress,
      setFromSubstrateAddress,
      toEvmAddress,
      setToEvmAddress,
      toSubstrateAddress,
      setToSubstrateAddress,
      toBtcAddress,
      setToBtcAddress,
      fromAddress,
      toAddress,

      // Token tab
      tokenTab,
      setTokenTab,

      // Actions
      resetForm,
      refreshQuotes,
      reverse,
      approvalCounter,
      setApprovalCounter,
      incrementApprovalCounter,

      // Async state
      fromAssetsLoadable,
      toAssetsLoadable,
      quotesLoadable,
      sortedQuotesLoadable,
      selectedQuoteLoadable,
      selectedModuleLoadable,
      toAmountLoadable,
      safeTokensLoadable,

      // Account info (spread from useFromAccount)
      ...fromAccountInfo,

      // ERC20 approval
      erc20Approval,

      // Init args
      stateInit,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- all values intentionally included
    [
      swapView,
      setSwapView,
      fromAsset,
      setFromAsset,
      toAsset,
      setToAsset,
      fromAmount,
      setFromAmount,
      selectedProtocol,
      setSelectedProtocol,
      selectedSubProtocol,
      setSelectedSubProtocol,
      quoteSorting,
      setQuoteSorting,
      fromEvmAddress,
      setFromEvmAddress,
      fromSubstrateAddress,
      setFromSubstrateAddress,
      toEvmAddress,
      setToEvmAddress,
      toSubstrateAddress,
      setToSubstrateAddress,
      toBtcAddress,
      setToBtcAddress,
      fromAddress,
      toAddress,
      tokenTab,
      setTokenTab,
      resetForm,
      refreshQuotes,
      reverse,
      approvalCounter,
      setApprovalCounter,
      incrementApprovalCounter,
      fromAssetsLoadable,
      toAssetsLoadable,
      quotesLoadable,
      sortedQuotesLoadable,
      selectedQuoteLoadable,
      selectedModuleLoadable,
      toAmountLoadable,
      safeTokensLoadable,
      fromAccountInfo,
      erc20Approval,
      stateInit,
    ]
  )
}

export const [SwapProvider, useSwap] = provideContext(useSwapProviderContext)
