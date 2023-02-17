import { requestStore } from "@core/libs/requests/store"

import { METADATA_PREFIX, MetadataDef } from "./types"

export const requestInjectMetadata = async (url: string, request: MetadataDef) => {
  await requestStore.createRequest({
    type: METADATA_PREFIX,
    url,
    request,
  })
  return true
}
