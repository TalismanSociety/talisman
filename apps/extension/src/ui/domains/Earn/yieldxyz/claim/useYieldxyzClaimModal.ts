import { createGlobalOpenClose } from "@talisman/hooks/createGlobalOpenClose"

import { YieldxyzClaimWizardInit } from "./useYieldxyzClaimWizard"

export const [useYieldxyzClaimModal] = createGlobalOpenClose<YieldxyzClaimWizardInit>()
