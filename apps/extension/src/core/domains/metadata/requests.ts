import { requestStore } from "@core/libs/requests/store"
import type { Port } from "@core/types/base"

import { METADATA_PREFIX, MetadataDef } from "./types"

export const requestInjectMetadata = async (url: string, request: MetadataDef, port: Port) => {
  await requestStore.createRequest(
    {
      type: METADATA_PREFIX,
      url,
      request,
    },
    port
  )
  return true
}
