import { createGlobalOpenClose } from "@ui/hooks/createGlobalOpenClose"

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
