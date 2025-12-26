import { Balance } from "@talismn/balances"
import { isTokenInTypes } from "@talismn/chaindata-provider"
import { planckToTokens } from "@talismn/util"
import { log } from "extension-shared"
import { uniq } from "lodash-es"
import { useCallback, useEffect, useMemo, useState } from "react"

import { provideContext } from "@talisman/util/provideContext"
import { BalanceByParamsProps, useBalancesByParams } from "@ui/hooks/useBalancesByParams"
import { useNetworkById } from "@ui/state"
import { useYieldxyzProduct } from "@ui/state/yieldxyz"

import { useDummyTransaction } from "../../hooks/useDummyTransaction"
import { useYieldxyzActionValidation } from "../../hooks/useYieldxyzActionValidation"
import { useGetYieldxyzToken } from "../hooks/useGetYieldxyzToken"
import { useYieldxyzAction } from "../hooks/useYieldxyzAction"
import { useYieldxyzTransactionManager } from "../hooks/useYieldxyzActionManager"
import { useYieldxyzEnterModal } from "./useYieldxyzEnterModal"

export type YieldxyzEnterWizardInit = {
  address?: string
  tokenId?: string // TODO use this to filter products that accept this token
  productId?: string
}

export type YieldxyzEnterWizardState = {
  step: "account" | "amount" | "confirm" // | "product"
  address: string | null
  productId: string | null
  validatorAddress: string | null // TODO remove, replace with generic "args"
  amountIn: bigint | null
}

const advanceStep = (state: YieldxyzEnterWizardState): YieldxyzEnterWizardState => {
  const selectStep = (state: YieldxyzEnterWizardState) => {
    // if (!state.productId) return "product"
    if (!state.address) return "account"
    return state.step
  }

  const step = selectStep(state)
  return { ...state, step }
}

const initializeState = (init: YieldxyzEnterWizardInit | null): YieldxyzEnterWizardState =>
  advanceStep({
    step: "amount",
    address: init?.address ?? null,
    productId: init?.productId ?? null,
    validatorAddress: null,
    amountIn: null,
  })

const useYieldxyzEnterWizardProvider = ({
  stateInit,
}: {
  stateInit: YieldxyzEnterWizardInit | null
}) => {
  const { close, isOpen } = useYieldxyzEnterModal()
  const [state, setState] = useState<YieldxyzEnterWizardState>(() => initializeState(stateInit))
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

  const balanceParams = useMemo<BalanceByParamsProps>(() => {
    if (!state.address || !tokenIn) return {}
    return {
      addressesAndTokens: {
        addresses: [state.address],
        tokenIds: [tokenIn.id],
      },
    }
  }, [state.address, tokenIn])
  const { status: balancesStatus, balances } = useBalancesByParams(balanceParams)
  const balance = useMemo(() => {
    return balances.each[0] as Balance | undefined
  }, [balances])
  //const balance = useBalance(state.address, tokenIn?.id) ?? 0n // TODO rework this hook so we can know the loading state

  const dummyTx = useDummyTransaction({
    address: state.address ?? undefined,
    tokenId: tokenIn?.id ?? undefined,
  })

  const [inputs, talismanValidationError] = useMemo(() => {
    if (!state.amountIn || !tokenIn || !balance) return [null, null]
    if (state.amountIn > balance.transferable.planck) return [null, "Insufficient balance"]

    const inputs = { amount: planckToTokens(state.amountIn.toString(), tokenIn.decimals) }
    return [inputs, null]
  }, [state.amountIn, tokenIn, balance])

  const { args, error: yieldxyzValidationError } = useYieldxyzActionValidation({
    schema: product?.mechanics.arguments?.enter,
    inputs,
  })

  const {
    canCreateAction,
    action, // ⚠️ action.transactions order changes over time, make sure to sort it based on stepIndex
    isLoading: isLoadingAction,
    error: errorAction,
    createAction,
    refreshAction,
    submitActionTransaction,
  } = useYieldxyzAction({
    type: "enter",
    address: state.address,
    yieldId: state.productId,
    args,
  })

  const onAmountInChanged = useCallback((amountIn: bigint | null) => {
    setState((state) => ({ ...state, amountIn }))
  }, [])

  const onAccountChanged = useCallback((address: string | null) => {
    setState((state) => advanceStep({ ...state, address, step: "amount" }))
  }, [])

  const goTo = useCallback((step: YieldxyzEnterWizardState["step"]) => {
    setState((state) => ({ ...state, step }))
  }, [])

  const onCompleted = useCallback(() => {
    if (isOpen) close()
  }, [close, isOpen])

  const setMaxAmountIn = useCallback(() => {
    if (!tokenIn || !balance) return

    const feeMargin = (dummyTx?.estimatedFee ? BigInt(dummyTx.estimatedFee) : 0n) * 10n

    // for native tokens, we need to keep some amount available for fees
    // however we do not have access to the payloads here to estimate fees accurately,
    // so we just leave a fixed buffer for now. this should be improved in the future
    const maxAmmount = isTokenInTypes(tokenIn, ["evm-native", "substrate-native", "sol-native"])
      ? balance.transferable.planck - feeMargin > 0n
        ? balance.transferable.planck - feeMargin
        : 0n
      : balance.transferable.planck

    setState((state) => ({
      ...state,
      amountIn: maxAmmount,
    }))
  }, [tokenIn, balance, dummyTx?.estimatedFee])

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
    validationError: talismanValidationError ?? yieldxyzValidationError,
    goTo,
    onAmountInChanged,
    setMaxAmountIn,
    onAccountChanged,
    onSubmit,
    isLoadingBalance: balancesStatus === "initialising",
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

export const [YieldxyzEnterWizardProvider, useYieldxyzEnterWizard] = provideContext(
  useYieldxyzEnterWizardProvider,
)
