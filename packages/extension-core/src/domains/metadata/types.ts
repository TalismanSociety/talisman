import type { MetadataRequest as PolkadotMetadataRequest } from "@polkadot/extension-base/background/types"
import type { MetadataDef } from "@polkadot/extension-inject/types"
import { HexString } from "@polkadot/util/types"

import { BaseRequest, BaseRequestId } from "../../types/base"

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
