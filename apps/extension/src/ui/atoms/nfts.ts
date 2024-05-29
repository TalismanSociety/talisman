import { api } from "@ui/api"

import { atomWithSubscription } from "./utils/atomWithSubscription"

export const nftsAtom = atomWithSubscription(api.nftsSubscribe, "nftsAtom")