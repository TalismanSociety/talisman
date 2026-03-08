import { createGlobalOpenClose } from "@ui/hooks/createGlobalOpenClose"
import type { TransactionEntry } from "../../shared/types"

// lives outside of SubnetTransactions.tsx to prevent modal to close when hot reloading in dev mode
export const [useTransactionModal] = createGlobalOpenClose<TransactionEntry>()
