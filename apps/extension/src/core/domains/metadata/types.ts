import type { HexString } from "@talismn/util"

import type { BaseRequest, BaseRequestId } from "../../types/base"
import type {
  MetadataDef,
  MetadataRequest as PolkadotMetadataRequest,
} from "../../types/pjsInterop"

export type { MetadataDef }

export type MetadataUpdateStatus = {
  isUpdating: boolean
}

export type METADATA_PREFIX = "metadata"
export const METADATA_PREFIX: METADATA_PREFIX = "metadata"

export type RequestMetadataId = BaseRequestId<METADATA_PREFIX>
export type MetadataRequest = PolkadotMetadataRequest &
  RequestMetadataIdOnly &
  BaseRequest<METADATA_PREFIX>

export type RequestMetadataIdOnly = {
  id: RequestMetadataId
}

export type RequestMetadataApprove = RequestMetadataIdOnly
export type RequestMetadataReject = RequestMetadataIdOnly

export type HexStringRequestIdOnly = {
  id: HexString
}

export type MetadataMessages = {
  "pri(metadata.approve)": [RequestMetadataApprove, boolean]
  "pri(metadata.get)": [string | null, MetadataDef | null]
  "pri(metadata.reject)": [RequestMetadataReject, boolean]
  "pri(metadata.list)": [null, MetadataDef[]]
  "pri(metadata.updates.subscribe)": [HexStringRequestIdOnly, boolean, MetadataUpdateStatus]
}

export type MetadataRequests = {
  [METADATA_PREFIX]: [MetadataRequest, boolean]
}
