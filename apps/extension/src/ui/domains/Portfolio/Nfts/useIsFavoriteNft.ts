import { useAtomValue } from "jotai"

import { isFavoriteNftAtomFamily } from "@ui/atoms"

export const useIsFavoriteNft = (id: string) => useAtomValue(isFavoriteNftAtomFamily(id))
