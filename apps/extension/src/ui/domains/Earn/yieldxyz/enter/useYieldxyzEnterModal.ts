import { createGlobalOpenClose } from "@ui/hooks/createGlobalOpenClose"

import type { YieldxyzEnterWizardInit } from "./useYieldxyzEnterWizard"

export const [useYieldxyzEnterModal] = createGlobalOpenClose<YieldxyzEnterWizardInit>()
