import { Codec } from "@polkadot/types-codec/types"
import { assert, u8aConcatStrict } from "@polkadot/util"
import { HexString } from "@polkadot/util/types"
import * as $ from "@talismn/subshape-fork"
import { api } from "@ui/api"
import Browser from "webextension-polyfill"

// TODO make another sig that use shapes for both args & result
export const stateCallRaw = async (
  chainId: string,
  method: string,
  args: Uint8Array[],
  blockHash?: HexString,
  isCacheable?: boolean
) => {
  assert(
    Browser.extension.getBackgroundPage() !== window,
    "@ui/util/stateCallRaw cannot be called from background page, use @core/util/stateCallRaw"
  )

  const result = await api.subSend<HexString>(
    chainId,
    "state_call",
    [method, $.encodeHex(u8aConcatStrict(args)), blockHash],
    isCacheable
  )

  return $.decodeHex(result)
}

export const stateCall = async <K extends string = string>(
  chainId: string,
  method: string,
  resultType: K,
  args: Codec[],
  blockHash?: HexString,
  isCacheable?: boolean
) => {
  assert(
    Browser.extension.getBackgroundPage() !== window,
    "@ui/util/stateCall cannot be called from background page, use @core/util/stateCall"
  )

  // on a state call there are always arguments
  const registry = args[0].registry

  const bytes = registry.createType("Raw", u8aConcatStrict(args.map((arg) => arg.toU8a())))
  //console.log("stateCallBytes", bytes.toHex());

  const result = await api.subSend<HexString>(
    chainId,
    "state_call",
    [method, bytes.toHex(), blockHash],
    isCacheable
  )

  return registry.createType(resultType, result)
}
