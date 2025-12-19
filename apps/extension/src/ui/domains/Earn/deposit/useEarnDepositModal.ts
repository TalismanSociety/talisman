import { createGlobalOpenClose } from "@talisman/hooks/createGlobalOpenClose"

import { EarnDepositWizardInit } from "./context"

export const [useEarnDepositModal] = createGlobalOpenClose<EarnDepositWizardInit>()
