import type { BuyEntry } from "@common/analytics/funds"
import { createGlobalOpenClose } from "@ui/hooks/createGlobalOpenClose"

export const [useRampsModal] = createGlobalOpenClose<{ entry: BuyEntry }>()
