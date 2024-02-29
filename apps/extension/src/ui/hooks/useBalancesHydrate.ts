import { HydrateDb } from "@talismn/balances"
import { balancesHydrateAtom } from "@ui/atoms"
import { useAtomValue } from "jotai"

export const useBalancesHydrate = (): HydrateDb => useAtomValue(balancesHydrateAtom)
