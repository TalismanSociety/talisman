import { bind } from "@react-rxjs/core"
import { TokenId } from "@talismn/chaindata-provider"
import { useCallback } from "react"
import { BehaviorSubject } from "rxjs"

interface EarnWizardState {
  tokenId?: TokenId
}

const DEFAULT_STATE: EarnWizardState = {
  tokenId: undefined,
}

const earnWizardState$ = new BehaviorSubject<EarnWizardState>(DEFAULT_STATE)

const setEarnWizardState = (state: EarnWizardState) => {
  if (state === earnWizardState$.value) return
  else earnWizardState$.next(state)
}

const [useEarnWizardState] = bind(earnWizardState$)

export const useResetEarnWizard = () => {
  return useCallback(
    (init: Pick<EarnWizardState, "tokenId">) => setEarnWizardState({ ...DEFAULT_STATE, ...init }),
    [],
  )
}

export const useEarnWizard = () => {
  const state = useEarnWizardState()

  return {
    tokenId: state.tokenId,
  }
}
