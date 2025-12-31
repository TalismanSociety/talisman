import { BalanceDto, isAccountOwned, PendingActionDto } from "extension-core"
import { log } from "extension-shared"
import { useCallback, useEffect, useMemo, useRef } from "react"

import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import { useAccountByAddress, useNetworkById, YieldxyzPositionEnhanced } from "@ui/state"

import { useYieldxyzTransactionManager } from "../hooks/useYieldxyzActionManager"
import { useYieldxyzPendingAction } from "../hooks/useYieldxyzPendingAction"
import { useYieldxyzManageModal } from "./useYieldxyzManageModal"

export type YieldxyzManageWizardInputs = {
  position: YieldxyzPositionEnhanced
  pendingAction: PendingActionDto
  balance?: BalanceDto | null
}

const useYieldxyzManageWizardProvider = ({
  position,
  pendingAction,
  balance,
}: {
  position: YieldxyzPositionEnhanced | null | undefined
  pendingAction: PendingActionDto | null | undefined
  balance: BalanceDto | null | undefined
}) => {
  const { close, isOpen } = useYieldxyzManageModal()

  const account = useAccountByAddress(position?.address)
  const network = useNetworkById(position?.networkId)

  const isOwned = useMemo(() => isAccountOwned(account), [account])

  const {
    canCreateAction,
    action, // ⚠️ action.transactions order changes over time, make sure to sort it based on stepIndex
    isLoading: isLoadingAction,
    error: errorAction,
    createAction,
    refreshAction,
    submitActionTransaction,
  } = useYieldxyzPendingAction({
    address: position?.address,
    yieldId: position?.yieldId,
    pendingAction: isOwned ? pendingAction : undefined,
  })

  const refInitialized = useRef(false)
  useEffect(() => {
    // create the action on load, only once
    if (canCreateAction && !refInitialized.current) {
      refInitialized.current = true
      createAction()
    }
  }, [canCreateAction, createAction])

  const onCompleted = useCallback(() => {
    // do not await the refresh or UI will flicker
    if (position) api.yieldxyzPositionRefresh(position)
    if (isOpen) close()
  }, [close, isOpen, position])

  const { stepIndex, transaction, isProcessing, onSubmit } = useYieldxyzTransactionManager({
    action,
    address: position?.address,
    networkId: position?.networkId,
    refreshAction,
    submitActionTransaction,
    onCompleted,
  })

  useEffect(() => {
    log.debug("useYieldxyzManageWizard state changed", {
      position,
      pendingAction,
      action,
      isLoadingAction,
      errorAction,
      transaction,
      canCreateAction,
    })
  }, [action, isLoadingAction, errorAction, transaction, position, pendingAction, canCreateAction])

  useEffect(() => {})

  return {
    position,
    balance,
    pendingAction,
    network,
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

export const [YieldxyzManageWizardProvider, useYieldxyzManageWizard] = provideContext(
  useYieldxyzManageWizardProvider,
)
