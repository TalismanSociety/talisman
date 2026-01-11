import { createGlobalOpenClose } from "@talisman/hooks/createGlobalOpenClose"

import { YieldxyzManageWizardInputs } from "./useYieldxyzManageWizard"

export const [useYieldxyzManageModal] = createGlobalOpenClose<YieldxyzManageWizardInputs>()
