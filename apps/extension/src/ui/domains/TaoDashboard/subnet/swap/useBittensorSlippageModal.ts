import { createGlobalOpenClose } from "@ui/hooks/createGlobalOpenClose"

// in its own module to avoid modal closing when editing it in dev mode
export const [useBittensorSlippageModal] = createGlobalOpenClose<{ netuid: number }>()
