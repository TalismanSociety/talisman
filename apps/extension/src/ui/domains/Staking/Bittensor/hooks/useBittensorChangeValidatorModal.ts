import { createGlobalOpenClose } from "@ui/hooks/createGlobalOpenClose"

import type { ChangeValidatorOpenOptions } from "./useBittensorChangeValidatorWizard"

export const [useBittensorChangeValidatorModal] =
  createGlobalOpenClose<ChangeValidatorOpenOptions>()
