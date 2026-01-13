import { createGlobalOpenClose } from "@talisman/hooks/createGlobalOpenClose"

import type { YieldxyzExitWizardInit } from "./useYieldxyzExitWizard"

export const [useYieldxyzExitModal] = createGlobalOpenClose<YieldxyzExitWizardInit>()
