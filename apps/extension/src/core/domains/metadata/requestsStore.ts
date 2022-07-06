import { RequestStore, TRespondableRequest } from "@core/libs/RequestStore"
import type { MetadataDef } from "@polkadot/extension-inject/types"

interface MetaRequest {
  id: string
  request: MetadataDef
  url: string
}

type MetaRequestRespondable = TRespondableRequest<MetaRequest, boolean>

export default class MetadataRequestsStore extends RequestStore<MetaRequest, boolean> {
  mapRequestToData({ id, request, url }: MetaRequestRespondable) {
    return {
      id,
      request,
      url,
    }
  }

  public injectMetadata(url: string, request: MetadataDef): Promise<boolean> {
    return this.createRequest({ url, request })
  }
}
