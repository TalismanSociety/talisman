import { createGlobalOpenClose } from "@talisman/hooks/createGlobalOpenClose"

import type { YieldxyzManageWizardInputs } from "./useYieldxyzManageWizard"

export const [useYieldxyzManageModal] = createGlobalOpenClose<YieldxyzManageWizardInputs>()
