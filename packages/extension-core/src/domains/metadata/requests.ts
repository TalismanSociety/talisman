import type { Port } from "../../types/base"
import { requestStore } from "../../libs/requests/store"
import { METADATA_PREFIX, MetadataDef } from "./types"

export const requestInjectMetadata = async (url: string, request: MetadataDef, port: Port) => {
  await requestStore.createRequest(
    {
      type: METADATA_PREFIX,
      url,
      request,
    },
    port,
  )
  return true
}
