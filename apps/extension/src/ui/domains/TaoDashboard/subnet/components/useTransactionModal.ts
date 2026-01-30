import { createGlobalOpenClose } from "@talisman/hooks/createGlobalOpenClose"
import type { TransactionEntry } from "./SubnetTransactions"

// lives outside of SubnetTransactions.tsx to prevent modal to close when hot reloading in dev mode
export const [useTransactionModal] = createGlobalOpenClose<TransactionEntry>()
