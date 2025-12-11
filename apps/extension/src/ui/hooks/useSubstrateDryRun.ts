import type { polkadot, polkadotAssetHub } from "@polkadot-api/descriptors"
import { getScaleApi } from "@talismn/sapi"
import { useQuery } from "@tanstack/react-query"
import { getMetadataRpcFromDef, SignerPayloadJSON } from "extension-core"
import { firstValueFrom } from "rxjs"

import { api } from "@ui/api"
import { getNetworkByGenesisHash$, getToken$ } from "@ui/state"

export type DryRunResult = (
  | typeof polkadot
  | typeof polkadotAssetHub
)["descriptors"]["apis"]["DryRunApi"]["dry_run_call"][1]

export const useSubstrateDryRun = (jsonPayload: SignerPayloadJSON | null | undefined) => {
  return useQuery({
    queryKey: ["useSubstrateDryRun", jsonPayload],
    queryFn: async () => {
      if (!jsonPayload) return null

      const sapi = await getSapiFromSignerPayloadJSON(jsonPayload)
      if (!sapi?.isApiAvailable("DryRunApi", "dry_run_call")) return null

      const decodedCall = sapi.getDecodedCallFromPayload(jsonPayload)

      return sapi.getDryRunCall<DryRunResult>(jsonPayload.address, decodedCall)
    },
    refetchInterval: 10_000,
  })
}

const getSapiFromSignerPayloadJSON = async (jsonPayload: SignerPayloadJSON | null | undefined) => {
  if (!jsonPayload) return null

  const chain = await firstValueFrom(getNetworkByGenesisHash$(jsonPayload.genesisHash))
  if (!chain) return null

  const token = await firstValueFrom(getToken$(chain.nativeTokenId))
  if (!token) return null

  const metadataDef = await api.subChainMetadata(jsonPayload.genesisHash)
  if (!metadataDef) return null

  const metadataRpc = getMetadataRpcFromDef(metadataDef)
  if (!metadataRpc) return null

  return getScaleApi(
    {
      chainId: chain.id,
      send: (...args) => api.subSend(chain.id, ...args),
      submit: api.subSubmit,
      submitWithBittensorMevShield: api.subSubmitWithBittensorMevShield,
    },
    metadataRpc,
    token,
    chain.hasCheckMetadataHash,
    chain.signedExtensions,
    chain.registryTypes,
  )
}
