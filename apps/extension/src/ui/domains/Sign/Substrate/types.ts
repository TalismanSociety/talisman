import { SignerPayloadJSON } from "extension-core"
import { FC } from "react"

import { DecodedCall } from "@ui/util/scaleApi"

export type SignCallDef = { pallet: string; call: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SignCustomUiComponent<Args = any> = FC<{
  decodedCall: DecodedCall<Args>
  payload: SignerPayloadJSON
}>
