import { KnownSigningRequestIdOnly } from "../signing/types"

export type SignetMessages = {
  "pub(signing.approveSign)": [KnownSigningRequestIdOnly<"substrate-sign">, boolean]
}
