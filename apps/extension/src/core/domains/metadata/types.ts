import { RequestIdOnly } from "@core/types/base"

export type {
  MetadataRequest,
  RequestMetadataSubscribe,
  RequestMetadataApprove,
  RequestMetadataReject,
} from "@polkadot/extension-base/background/types"

export interface MetadataMessages {
  "pri(metadata.updates.subscribe)": [RequestIdOnly, boolean, MetadataUpdateStatus]
}

export type MetadataUpdateStatus = {
  isUpdating: boolean
}
