import type { BalanceDto, PendingActionDto } from "@core/domains/earn/exports"
import { isAccountOwned } from "@core/domains/keyring/exports"
import { api } from "@ui/api"
import { useAccountByAddress } from "@ui/state/accounts"
import { useNetworkById } from "@ui/state/chaindata"
import type { YieldxyzPositionEnhanced } from "@ui/state/yieldxyz"
import { provideContext } from "@ui/util/provideContext"
import { useCallback, useEffect, useMemo, useRef } from "react"

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
      createAction().catch(() => {
        refInitialized.current = false // Allow retry
      })
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
  useYieldxyzManageWizardProvider
)
