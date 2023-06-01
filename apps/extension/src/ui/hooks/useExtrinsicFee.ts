import { isJsonPayload } from "@core/util/isJsonPayload"
import { IRuntimeVersionBase, SignerPayloadJSON, SignerPayloadRaw } from "@polkadot/types/types"
import { HexString } from "@polkadot/util/types"
import { useQuery } from "@tanstack/react-query"
import { api } from "@ui/api"
import { getExtrinsicDispatchInfo } from "@ui/util/getExtrinsicDispatchInfo"

import useChainByGenesisHash from "./useChainByGenesisHash"
import { useExtrinsic } from "./useExtrinsic"

export const useExtrinsicFee = (payload?: SignerPayloadJSON | SignerPayloadRaw) => {
  const safePayload = payload && isJsonPayload(payload) ? payload : undefined
  const chain = useChainByGenesisHash(safePayload?.genesisHash)
  const qExtrinsic = useExtrinsic(safePayload)

  const { data: extrinsic } = qExtrinsic

  const qFee = useQuery({
    queryKey: ["usePolkadotTransactionFee", safePayload, chain, extrinsic?.toHex()],
    queryFn: async () => {
      if (!safePayload || !chain || !extrinsic) return null

      const [blockHash, runtimeVersion] = await Promise.all([
        api.subSend<HexString>(chain.id, "chain_getBlockHash", [], false),
        api.subSend<IRuntimeVersionBase>(chain.id, "state_getRuntimeVersion", [], true),
      ])

      // fake sign it so fees can be queried
      const { address, nonce, genesisHash } = safePayload
      extrinsic.signFake(address, { nonce, blockHash, genesisHash, runtimeVersion })

      const { partialFee } = await getExtrinsicDispatchInfo(chain.id, extrinsic, blockHash)

      return BigInt(partialFee)
    },
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,
    enabled: !!extrinsic,
  })

  return (qExtrinsic.isLoading ? qExtrinsic : qFee) as typeof qFee
}
