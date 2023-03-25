import { HydrateDb } from "@talismn/balances"
import { balancesHydrateState } from "@ui/atoms"
import { useRecoilValue } from "recoil"

export const useBalancesHydrate = (): HydrateDb => useRecoilValue(balancesHydrateState)
