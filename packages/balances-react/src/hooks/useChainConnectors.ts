import { useAtomValue } from "jotai"

import { chainConnectorsAtom } from "../atoms/chainConnectors"

export const useChainConnectors = () => {
  return useAtomValue(chainConnectorsAtom)
}
