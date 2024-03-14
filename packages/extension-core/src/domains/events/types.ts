import type { Codec } from "@polkadot/types-codec/types"
import type { Phase } from "@polkadot/types/interfaces"
import type { IEventData } from "@polkadot/types/types"
import type { TypeDef } from "@polkadot/types/types"

// event types ------------------------------

export type Event = {
  section: string
  method: string
  docs: string
  phase: Phase
  data: Codec[] & IEventData
  types: TypeDef[]
}

export type EventList = Event[]
