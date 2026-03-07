import { createGlobalOpenClose } from "@ui/hooks/createGlobalOpenClose"

import type { YieldxyzExitWizardInit } from "./useYieldxyzExitWizard"

export const [useYieldxyzExitModal] = createGlobalOpenClose<YieldxyzExitWizardInit>()
