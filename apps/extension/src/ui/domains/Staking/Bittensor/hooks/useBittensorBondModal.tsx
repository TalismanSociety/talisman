import { createGlobalOpenClose } from "@ui/hooks/createGlobalOpenClose"

import type { BittensorStakingWizardOpenOptions } from "./useBittensorBondWizard"

export const [useBittensorBondModal] = createGlobalOpenClose<BittensorStakingWizardOpenOptions>()
