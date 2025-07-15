import { SignerPayloadJSON } from "@polkadot/types/types"

import { DecodedCall } from "../types"
import { Chain } from "./types"

export const getDecodedCall = (palletName: string, methodName: string, args: unknown) => ({
  type: palletName,
  value: { type: methodName, value: args },
})

export const getDecodedCallFromPayload = <Res extends DecodedCall>(
  chain: Chain,
  payload: { method: SignerPayloadJSON["method"] },
): Res => {
  const def = chain.builder.buildDefinition(chain.lookup.call!)
  const decoded = def.dec(payload.method)

  return {
    pallet: decoded.type,
    method: decoded.value.type,
    args: decoded.value.value,
  } as Res
}
