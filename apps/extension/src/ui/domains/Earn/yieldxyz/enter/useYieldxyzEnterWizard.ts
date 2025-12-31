import { Balance } from "@talismn/balances"
import { isTokenInTypes, TokenId } from "@talismn/chaindata-provider"
import { isNotNil, planckToTokens } from "@talismn/util"
import { log } from "extension-shared"
import { useCallback, useMemo, useState } from "react"

import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import { BalanceByParamsProps, useBalancesByParams } from "@ui/hooks/useBalancesByParams"
import { useDummyTransaction } from "@ui/hooks/useDummyTransaction"
import { useNetworkById, useYieldxyzProduct } from "@ui/state"

import { useGetYieldxyzToken } from "../hooks/useGetYieldxyzToken"
import { useYieldxyzAction } from "../hooks/useYieldxyzAction"
import { useYieldxyzTransactionManager } from "../hooks/useYieldxyzActionManager"
import { useYieldxyzActionValidation } from "../hooks/useYieldxyzActionValidation"
import { useYieldxyzEnterModal } from "./useYieldxyzEnterModal"

export type YieldxyzEnterWizardInit = {
  address?: string
  pickerTokenIds?: TokenId[] // used to restrict token selection when opening the wizard from portfolio
  productId?: string
}

export type YieldxyzEnterWizardState = {
  step: "token" | "product" | "account" | "amount" | "confirm"
  pickerTokenId?: TokenId | null // only used when opening the wizard with a specific token selected
  address: string | null
  productId: string | null
  amountIn: bigint | null
}

const advanceStep = (state: YieldxyzEnterWizardState): YieldxyzEnterWizardState => {
  const selectStep = (state: YieldxyzEnterWizardState) => {
    if (!state.productId) return state.pickerTokenId ? "product" : "token"

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
    if (!product?.inputTokens.length) return null

    const tokens = product.inputTokens.map(getYieldxyzToken).filter(isNotNil)
    if (tokens.length !== product.inputTokens.length) return null

    if (tokens.length > 1) {
      // some products support both ETH and WETH as inputs. allow those but force native token as input
      const natives = tokens.filter((t) =>
        isTokenInTypes(t, ["evm-native", "substrate-native", "sol-native"]),
      )
      if (natives.length === 1) return natives[0]!

      log.error("Product has multiple different input tokens, which is not supported", {
        product,
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

  const onPickerTokenChanged = useCallback((pickerTokenId: string | null) => {
    setState((state) => advanceStep({ ...state, pickerTokenId, step: "product" }))
  }, [])

  const onProductChanged = useCallback((productId: string | null) => {
    setState((state) => advanceStep({ ...state, productId, step: "amount" }))
  }, [])

  const goTo = useCallback((step: YieldxyzEnterWizardState["step"]) => {
    setState((state) => ({ ...state, step }))
  }, [])

  const onCompleted = useCallback(() => {
    // do not await the refresh or UI will flicker
    if (state.address && state.productId)
      api.yieldxyzPositionRefresh({
        address: state.address,
        yieldId: state.productId,
      })
    if (isOpen) close()
  }, [close, isOpen, state.address, state.productId])

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
    onProductChanged,
    onPickerTokenChanged,
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
    pickerTokenIds: stateInit?.pickerTokenIds,
  }
}

export const [YieldxyzEnterWizardProvider, useYieldxyzEnterWizard] = provideContext(
  useYieldxyzEnterWizardProvider,
)
