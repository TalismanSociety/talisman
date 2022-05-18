import type { MnemonicSubscriptionResult } from "@core/types"
import { api } from "@ui/api"
import { useMessageSubscription } from "./useMessageSubscription"
import { BehaviorSubject } from "rxjs"

type MnemonicBackupConfirmed = "UNKNOWN" | "TRUE" | "FALSE"

const INITIAL_VALUE: MnemonicSubscriptionResult = {}

const subscribe = (subject: BehaviorSubject<MnemonicSubscriptionResult>) =>
  api.mnemonicSubscribe((v) => subject.next(v))

const transform = (value: MnemonicSubscriptionResult): MnemonicBackupConfirmed => {
  if (value.confirmed === undefined) return "UNKNOWN"
  return value.confirmed ? "TRUE" : "FALSE"
}

export const useMnemonicBackupConfirmed = () =>
  useMessageSubscription("mnemonicSubscribe", INITIAL_VALUE, subscribe, transform)
