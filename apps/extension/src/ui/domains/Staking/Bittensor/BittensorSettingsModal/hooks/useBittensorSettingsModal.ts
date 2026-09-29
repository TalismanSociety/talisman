import { createGlobalOpenClose } from "@ui/hooks/createGlobalOpenClose"

import type { BittensorSettingsOpenOptions } from "./useBittensorSettingsWizard"

export const [useBittensorSettingsModal] = createGlobalOpenClose<BittensorSettingsOpenOptions>()
