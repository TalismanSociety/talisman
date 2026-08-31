import type { HexString } from "@talismn/util"

import type { MetadataDef } from "../../types/pjsInterop"

export type { MetadataDef }

export type MetadataUpdateStatus = {
  isUpdating: boolean
}

export type HexStringRequestIdOnly = {
  id: HexString
}

export type MetadataMessages = {
  "pri(metadata.get)": [string | null, MetadataDef | null]
  "pri(metadata.list)": [null, MetadataDef[]]
  "pri(metadata.updates.subscribe)": [HexStringRequestIdOnly, boolean, MetadataUpdateStatus]
}
