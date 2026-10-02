import { type FlowBase, flowRegistry, type Lifecycle } from "./defineFlow"
import { accountProxyAdd, accountProxyRemove } from "./definitions/accountProxy"
import { addAccount } from "./definitions/addAccount"
import { onboarding } from "./definitions/onboarding"
import { passwordChange } from "./definitions/passwordChange"
import { passwordMigration } from "./definitions/passwordMigration"
import { quickUnlockSetup } from "./definitions/quickUnlockSetup"
import { recoveryPhraseBackup } from "./definitions/recoveryPhraseBackup"
import { walletReset } from "./definitions/walletReset"

export const FLOWS = flowRegistry(
  recoveryPhraseBackup,
  onboarding,
  walletReset,
  passwordChange,
  passwordMigration,
  quickUnlockSetup,
  addAccount,
  accountProxyAdd,
  accountProxyRemove
)

export type Flows = typeof FLOWS
export type FlowName = keyof Flows & string

export const flowList = (): readonly FlowBase[] => Object.values(FLOWS)

export type FlowEventRef = { readonly flow: FlowBase; readonly lifecycle: Lifecycle }

const indexFlowEvents = (flows: readonly FlowBase[]) => {
  const refs = new Map<string, FlowEventRef>(
    flows.flatMap((flow) =>
      Object.entries(flow.eventNames).map(([lifecycle, event]) => [
        event,
        { flow, lifecycle: lifecycle as Lifecycle },
      ])
    )
  )
  return (event: string): FlowEventRef | null => refs.get(event) ?? null
}

export const flowEventRef = indexFlowEvents(flowList())
