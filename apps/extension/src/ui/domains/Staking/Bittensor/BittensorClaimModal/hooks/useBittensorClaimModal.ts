import { createGlobalOpenClose } from "@ui/hooks/createGlobalOpenClose"

import type { BittensorClaimOpenOptions } from "./useBittensorClaimWizard"

export const [useBittensorClaimModal] = createGlobalOpenClose<BittensorClaimOpenOptions>()
