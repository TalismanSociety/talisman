import { log } from "extension-shared"
import { useCallback, useEffect, useMemo, useState } from "react"

import { provideContext } from "@talisman/util/provideContext"
import { useNetworkById } from "@ui/state"
import { YieldxyzPositionEnhanced } from "@ui/state/yieldxyz"

import { useYieldxyzAction } from "../hooks/useYieldxyzAction"
import { useYieldxyzTransactionManager } from "../hooks/useYieldxyzActionManager"
import { useYieldxyzActionValidation } from "../hooks/useYieldxyzActionValidation"
import { useYieldxyzClaimModal } from "./useYieldxyzClaimModal"

export type YieldxyzClaimWizardInit = YieldxyzPositionEnhanced

export type YieldxyzClaimWizardState = {
  step: "amount" | "confirm"
  position: YieldxyzClaimWizardInit | null
}

const useYieldxyzClaimWizardProvider = ({
  position,
}: {
  position: YieldxyzPositionEnhanced | null
}) => {
  const { close, isOpen } = useYieldxyzClaimModal()
  const [state, setState] = useState<YieldxyzClaimWizardState>(() => ({
    step: "amount",
    position,
  }))

  const network = useNetworkById(state.position?.networkId)

  const balance = useMemo(() => {
    // here we assume there can only be one active balance per position
    // might need to verify this later
    const activeBalances = state.position?.balances.filter((b) => b.type === "claimable")
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
    // TODO look for gotchas here, this is a simplified version
    if (!balance) return [null, null]
    return [{ amount: balance.amount }, null]
  }, [balance])

  const { args, error: yieldxyzValidationError } = useYieldxyzActionValidation({
    schema: state.position?.product?.mechanics.arguments?.manage?.["CLAIM"], // TODO pick the correct action dynamically, from balance.pendingActions
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
    type: "exit", // TODO update to use  "manage"
    address: state.position?.address,
    yieldId: state.position?.yieldId,
    args,
  })

  const onAmountOutChanged = useCallback((amountOut: bigint | null) => {
    setState((state) => ({ ...state, amountOut }))
  }, [])

  const goTo = useCallback((step: YieldxyzClaimWizardState["step"]) => {
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
    log.debug("useYieldxyzClaimWizard state changed", {
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

export const [YieldxyzClaimWizardProvider, useYieldxyzClaimWizard] = provideContext(
  useYieldxyzClaimWizardProvider,
)
