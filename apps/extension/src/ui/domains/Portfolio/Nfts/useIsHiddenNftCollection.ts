import { useAtomValue } from "jotai"

import { isHiddenNftCollectionAtomFamily } from "@ui/atoms"

export const useIsHiddenNftCollection = (id: string) =>
  useAtomValue(isHiddenNftCollectionAtomFamily(id))
