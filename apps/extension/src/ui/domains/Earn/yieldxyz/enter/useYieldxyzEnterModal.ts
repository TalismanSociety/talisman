import { createGlobalOpenClose } from "@talisman/hooks/createGlobalOpenClose"

import { YieldxyzEnterWizardInit } from "./useYieldxyzEnterWizard"

export const [useYieldxyzEnterModal] = createGlobalOpenClose<YieldxyzEnterWizardInit>()
