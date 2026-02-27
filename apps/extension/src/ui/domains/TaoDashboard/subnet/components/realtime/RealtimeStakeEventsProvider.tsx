import { provideContext } from "@talisman/util/provideContext"

import { type UseRealtimeStakeEventsReturn, useRealtimeStakeEvents } from "./useRealtimeStakeEvents"

const useRealtimeStakeEventsProvider = ({
  netuid,
}: {
  netuid: number | null | undefined
}): UseRealtimeStakeEventsReturn => {
  return useRealtimeStakeEvents(netuid)
}

export const [RealtimeStakeEventsProvider, useRealtimeStakeEventsContext] = provideContext(
  useRealtimeStakeEventsProvider
)
