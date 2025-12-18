import { planckToTokens } from "@talismn/util"
import { log } from "extension-shared"
import { uniq } from "lodash-es"
import { useCallback, useEffect, useMemo, useState } from "react"

import { provideContext } from "@talisman/util/provideContext"
import { useBalance, useNetworkById } from "@ui/state"
import { useYieldxyzProduct } from "@ui/state/yield"

import { useGetYieldxyzToken } from "../components/useGetYieldxyzToken"
import { useYieldxyzTransactionManager } from "../shared/useYieldxyzActionManager"
import { useEarnDepositModal } from "./useEarnDepositModal"
import { useYieldxyzEnterAction } from "./useYieldxyzEnterAction"

export type EarnDepositWizardInit = {
  address?: string
  tokenId?: string
  productId?: string
}

export type EarnDepositWizardState = {
  step: "product" | "account" | "validator" | "amount" | "confirm" | "follow-up"
  address: string | null
  productId: string | null
  validatorAddress: string | null // TODO remove, replace with generic "args"
  amountIn: bigint | null
}

const advanceStep = (state: EarnDepositWizardState): EarnDepositWizardState => {
  const selectStep = (state: EarnDepositWizardState) => {
    if (!state.productId) return "product"
    if (!state.address) return "account"
    return state.step
  }

  const step = selectStep(state)
  return { ...state, step }
}

const initializeState = (init: EarnDepositWizardInit | null): EarnDepositWizardState =>
  advanceStep({
    step: "amount",
    address: init?.address ?? null,
    productId: init?.productId ?? null,
    validatorAddress: null,
    amountIn: null,
  })

const useEarnDepositWizardProvider = ({ args }: { args: EarnDepositWizardInit | null }) => {
  const { close, isOpen } = useEarnDepositModal()
  const [state, setState] = useState<EarnDepositWizardState>(() => initializeState(args))
  const { status, data: product } = useYieldxyzProduct(state.productId)
  const { getYieldxyzToken } = useGetYieldxyzToken()

  const tokenIn = useMemo(() => {
    if (!product) return null
    const tokens = product.inputTokens.map(getYieldxyzToken)
    if (!tokens.length) return null
    if (tokens.some((t) => t === null)) return null
    if (uniq(tokens.map((t) => t!.id)).length > 1) {
      log.error("Product has multiple different input tokens, which is not supported", {
        productId: product.id,
        tokens,
      })
      return null
    }
    return tokens[0]!
  }, [product, getYieldxyzToken])

  const network = useNetworkById(tokenIn?.networkId)

  const balance = useBalance(state.address, tokenIn?.id)

  const amount = useMemo(() => {
    if (state.amountIn === null || !tokenIn) return null
    return planckToTokens(state.amountIn.toString(), tokenIn.decimals)
  }, [state.amountIn, tokenIn])

  const {
    canCreateAction,
    action, // ⚠️ action.transactions order changes over time, make sure to sort it based on stepIndex
    isLoading: isLoadingAction,
    error: errorAction,
    createAction,
    refreshAction,
    submitActionTransaction,
  } = useYieldxyzEnterAction({
    address: state.address,
    yieldId: state.productId,
    amount,
    validatorAddress: state.validatorAddress,
  })

  const onAmountInChanged = useCallback((amountIn: bigint | null) => {
    setState((state) => ({ ...state, amountIn }))
  }, [])

  const onAccountChanged = useCallback((address: string | null) => {
    setState((state) => advanceStep({ ...state, address, step: "amount" }))
  }, [])

  const goTo = useCallback((step: EarnDepositWizardState["step"]) => {
    setState((state) => ({ ...state, step }))
  }, [])

  const onCompleted = useCallback(() => {
    if (isOpen) close()
  }, [close, isOpen])

  const { stepIndex, transaction, isProcessing, onSubmit } = useYieldxyzTransactionManager({
    action,
    address: state.address,
    networkId: tokenIn?.networkId ?? null,
    refreshAction,
    submitActionTransaction,
    onCompleted,
  })

  useEffect(() => {
    log.debug("useEarnDepositWizard state changed", {
      ...state,
      tokenIn,
      product,
      action,
      isLoadingAction,
      errorAction,
      transaction,
    })
  }, [state, tokenIn, product, action, isLoadingAction, errorAction, transaction])

  return {
    ...state,
    tokenIn,
    network,
    balance,
    product,
    goTo,
    onAmountInChanged,
    onAccountChanged,
    onSubmit,
    isLoadingProduct: status === "loading" && !product,
    isLoadingAction,
    isProcessing,
    action,
    errorAction,
    stepIndex,
    transaction,
    canCreateAction,
    createAction,
  }
}

export const [EarnDepositWizardProvider, useEarnDepositWizard] = provideContext(
  useEarnDepositWizardProvider,
)
