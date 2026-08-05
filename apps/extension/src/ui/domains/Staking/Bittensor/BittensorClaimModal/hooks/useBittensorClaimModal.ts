import type { DTaoClaimTarget } from "@talismn/balances"
import { createGlobalOpenClose } from "@ui/hooks/createGlobalOpenClose"

export const [useBittensorClaimModal] = createGlobalOpenClose<DTaoClaimTarget>()
