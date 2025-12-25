import { createGlobalOpenClose } from "@talisman/hooks/createGlobalOpenClose"

import { YieldxyzExitWizardInit } from "./useYieldxyzExitWizard"

export const [useYieldxyzEnterModal] = createGlobalOpenClose<YieldxyzExitWizardInit>()
