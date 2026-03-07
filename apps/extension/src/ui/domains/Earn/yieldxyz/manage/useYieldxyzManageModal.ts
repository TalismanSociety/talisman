import { createGlobalOpenClose } from "@ui/hooks/createGlobalOpenClose"

import type { YieldxyzManageWizardInputs } from "./useYieldxyzManageWizard"

export const [useYieldxyzManageModal] = createGlobalOpenClose<YieldxyzManageWizardInputs>()
