import { chainByGenesisHashQuery } from "@ui/atoms"
import { useRecoilValue } from "recoil"

export const useChainByGenesisHash = (genesisHash: string | null | undefined) =>
  useRecoilValue(chainByGenesisHashQuery(genesisHash))
