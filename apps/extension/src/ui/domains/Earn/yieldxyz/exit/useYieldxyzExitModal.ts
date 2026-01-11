import { createGlobalOpenClose } from "@talisman/hooks/createGlobalOpenClose"

import { YieldxyzExitWizardInit } from "./useYieldxyzExitWizard"

export const [useYieldxyzExitModal] = createGlobalOpenClose<YieldxyzExitWizardInit>()
