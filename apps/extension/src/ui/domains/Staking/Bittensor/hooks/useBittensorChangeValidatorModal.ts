import { createGlobalOpenClose } from "@talisman/hooks/createGlobalOpenClose"

import type { ChangeValidatorOpenOptions } from "./useBittensorChangeValidatorWizard"

export const [useBittensorChangeValidatorModal] =
  createGlobalOpenClose<ChangeValidatorOpenOptions>()
