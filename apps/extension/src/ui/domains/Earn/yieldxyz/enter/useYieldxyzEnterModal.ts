import { createGlobalOpenClose } from "@talisman/hooks/createGlobalOpenClose"

import type { YieldxyzEnterWizardInit } from "./useYieldxyzEnterWizard"

export const [useYieldxyzEnterModal] = createGlobalOpenClose<YieldxyzEnterWizardInit>()
