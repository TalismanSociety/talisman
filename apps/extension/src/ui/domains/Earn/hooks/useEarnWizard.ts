import { bind } from "@react-rxjs/core"
import { TokenId } from "@talismn/chaindata-provider"
import { useCallback } from "react"
import { BehaviorSubject } from "rxjs"

interface EarnWizardState {
  tokenId?: TokenId
  selectedAccountAddress?: string
  selectedNetworkId?: string
}

const DEFAULT_STATE: EarnWizardState = {
  tokenId: undefined,
  selectedAccountAddress: undefined,
  selectedNetworkId: undefined,
}

const earnWizardState$ = new BehaviorSubject<EarnWizardState>(DEFAULT_STATE)

const setEarnWizardState = (state: EarnWizardState) => {
  if (state === earnWizardState$.value) return
  else earnWizardState$.next(state)
}

const [useEarnWizardState] = bind(earnWizardState$)

export const useResetEarnWizard = () => {
  return useCallback(
    (init: Pick<EarnWizardState, "tokenId" | "selectedAccountAddress" | "selectedNetworkId">) =>
      setEarnWizardState({ ...DEFAULT_STATE, ...init }),
    [],
  )
}

export const useEarnWizard = () => {
  const state = useEarnWizardState()

  return {
    tokenId: state.tokenId,
    selectedAccountAddress: state.selectedAccountAddress,
    selectedNetworkId: state.selectedNetworkId,
  }
}

export const useSetEarnWizardAccount = () => {
  return useCallback((selectedAccountAddress: string) => {
    setEarnWizardState({ ...earnWizardState$.value, selectedAccountAddress })
  }, [])
}

export const useSetEarnWizardNetwork = () => {
  return useCallback((selectedNetworkId: string) => {
    setEarnWizardState({ ...earnWizardState$.value, selectedNetworkId })
  }, [])
}
