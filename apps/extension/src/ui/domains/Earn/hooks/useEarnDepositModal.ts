import { createGlobalOpenClose } from "@ui/hooks/createGlobalOpenClose"

import type { EarnOpportunity } from "../types"

export type EarnDepositModalArgs = {
  tokenId: string
  opportunities: EarnOpportunity[]
  discoverOnly?: boolean
}

export const [useEarnDepositModal] = createGlobalOpenClose<EarnDepositModalArgs>()
