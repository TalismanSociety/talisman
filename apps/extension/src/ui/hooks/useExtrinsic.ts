import { isJsonPayload } from "@extension/core"
import { log } from "@extension/shared"
import { SignerPayloadJSON, SignerPayloadRaw } from "@polkadot/types/types"
import { hexToNumber } from "@polkadot/util"
import { useQuery } from "@tanstack/react-query"
import { getFrontendTypeRegistry } from "@ui/util/getFrontendTypeRegistry"

const decodeExtrinsic = async (payload: SignerPayloadJSON) => {
  try {
    const { genesisHash, signedExtensions, specVersion: hexSpecVersion } = payload

    const { registry } = await getFrontendTypeRegistry(
      genesisHash,
      hexToNumber(hexSpecVersion),
      undefined, // dapp may be using an RPC that is a block ahead our provder's RPC, do not specify payload's blockHash or it could throw
      signedExtensions
    )

    return registry.createType("Extrinsic", payload)
  } catch (err) {
    log.error("Failed to decode extrinsic", { err })
    throw err
  }
}

export const useExtrinsic = (payload?: SignerPayloadJSON | SignerPayloadRaw) => {
  return useQuery({
    queryKey: ["useExtrinsic", payload],
    queryFn: () => (payload && isJsonPayload(payload) ? decodeExtrinsic(payload) : null),
    refetchOnMount: false,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retryOnMount: false,
    retry: 2,
  })
}
