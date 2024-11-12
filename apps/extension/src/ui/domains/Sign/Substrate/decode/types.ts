import { PolkadotCalls } from "papi-descriptors"

export type SupportedCallBatch =
  | {
      pallet: "Utility"
      call: "batch"
      args: PolkadotCalls["Utility"]["batch"]
    }
  | {
      pallet: "Utility"
      call: "batch_all"
      args: PolkadotCalls["Utility"]["batch_all"]
    }
  | {
      pallet: "Utility"
      call: "force_batch"
      args: PolkadotCalls["Utility"]["force_batch"]
    }
