import { planckToTokens } from "@talismn/util"
import { YieldxyzPositionEnhanced } from "extension-core"
import { log } from "extension-shared"
import { useCallback, useEffect, useMemo, useState } from "react"

import { provideContext } from "@talisman/util/provideContext"
import { useNetworkById } from "@ui/state"

import { useYieldxyzActionValidation } from "../../hooks/useYieldxyzActionValidation"
import { useYieldxyzAction } from "../hooks/useYieldxyzAction"
import { useYieldxyzTransactionManager } from "../hooks/useYieldxyzActionManager"
import { useYieldxyzExitModal } from "./useYieldxyzExitModal"

export type YieldxyzExitWizardInit = YieldxyzPositionEnhanced

export type YieldxyzExitWizardState = {
  step: "amount" | "confirm"
  position: YieldxyzExitWizardInit | null
  amountOut: bigint | null
}

const useYieldxyzExitWizardProvider = ({
  position,
}: {
  position: YieldxyzPositionEnhanced | null
}) => {
  const { close, isOpen } = useYieldxyzExitModal()
  const [state, setState] = useState<YieldxyzExitWizardState>(() => ({
    step: "amount",
    position,
    amountOut: null,
  }))

  const network = useNetworkById(state.position?.networkId)

  const balance = useMemo(() => {
    // here we assume there can only be one active balance per position
    // might need to verify this later
    const activeBalances = state.position?.balances.filter((b) => b.type === "active")
    if (!activeBalances?.length) return undefined
    if (activeBalances.length > 1) {
      log.warn("Position has multiple active balances, which is not supported", {
        position,
        activeBalances,
      })
      return undefined
    }

    return activeBalances[0]
  }, [position, state.position?.balances])

  const [inputs, talismanValidationError] = useMemo(() => {
    if (!state.amountOut || !position?.product.token || !balance) return [null, null]
    if (state.amountOut > BigInt(balance.amountRaw)) return [null, "Insufficient balance"]

    const inputs = {
      amount: planckToTokens(state.amountOut.toString(), balance.token.decimals),
    }
    return [inputs, null]
  }, [state.amountOut, position?.product.token, balance])

  const { args, error: yieldxyzValidationError } = useYieldxyzActionValidation({
    schema: state.position?.product?.mechanics.arguments?.exit,
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
    type: "exit",
    address: state.position?.address,
    yieldId: state.position?.yieldId,
    args,
  })

  const onAmountOutChanged = useCallback((amountOut: bigint | null) => {
    setState((state) => ({ ...state, amountOut }))
  }, [])

  const goTo = useCallback((step: YieldxyzExitWizardState["step"]) => {
    setState((state) => ({ ...state, step }))
  }, [])

  const onCompleted = useCallback(() => {
    if (isOpen) close()
  }, [close, isOpen])

  const setMaxAmountOut = useCallback(() => {
    if (!balance) return
    setState((state) => ({ ...state, amountOut: BigInt(balance.amountRaw) }))
  }, [balance])

  const { stepIndex, transaction, isProcessing, onSubmit } = useYieldxyzTransactionManager({
    action,
    address: state.position?.address,
    networkId: state.position?.networkId,
    refreshAction,
    submitActionTransaction,
    onCompleted,
  })

  useEffect(() => {
    log.debug("useYieldxyzExitWizard state changed", {
      ...state,
      balance,
      action,
      isLoadingAction,
      errorAction,
      transaction,
    })
  }, [state, action, isLoadingAction, errorAction, transaction, balance])

  return {
    ...state,
    network,
    balance,
    validationError: talismanValidationError ?? yieldxyzValidationError,
    goTo,
    onAmountOutChanged,
    setMaxAmountOut,
    onSubmit,
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

export const [YieldxyzExitWizardProvider, useYieldxyzExitWizard] = provideContext(
  useYieldxyzExitWizardProvider,
)
