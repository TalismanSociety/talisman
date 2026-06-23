import { createGlobalOpenClose } from "@ui/hooks/createGlobalOpenClose"

// these values double as contract function names: SeekStakingModal encodes the transaction with
// `encodeFunctionData({ abi: seekSinglePoolStakingAbi, functionName: action })`, so each value
// must match a function of that ABI — do not rename them for display purposes
export type SeekStakingAction =
  | "stake"
  | "requestWithdrawal"
  | "completeWithdrawal"
  | "getReward"
  | "cancelWithdrawal"

export type SeekStakingModalArgs = {
  action: SeekStakingAction
  address?: string
}

export const [useSeekStakingModal] = createGlobalOpenClose<SeekStakingModalArgs>()
