import { HexString } from "@polkadot/util/types"
import { chainByGenesisHashAtomFamily } from "@ui/atoms"
import { useAtomValue } from "jotai"

export const useChainByGenesisHash = (genesisHash: string | null | undefined) =>
  useAtomValue(chainByGenesisHashAtomFamily(genesisHash as HexString))
