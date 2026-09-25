import type { HexString } from "@talismn/util"

export type MetadataUpdateStatus = {
  isUpdating: boolean
}

export type HexStringRequestIdOnly = {
  id: HexString
}

export type MetadataMessages = {
  "pri(metadata.updates.subscribe)": [HexStringRequestIdOnly, boolean, MetadataUpdateStatus]
}
