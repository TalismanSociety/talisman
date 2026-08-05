import { createGlobalOpenClose } from "@ui/hooks/createGlobalOpenClose"

import type { BittensorClaimTarget } from "../../utils/claimableRewards"

export const [useBittensorClaimModal] = createGlobalOpenClose<BittensorClaimTarget>()
