import { chainConnector } from "@core/rpcs/chain-connector"
import { Codec } from "@polkadot/types-codec/types"
import { assert, u8aConcatStrict } from "@polkadot/util"
import { HexString } from "@polkadot/util/types"
import Browser from "webextension-polyfill"

export const stateCall = async <K extends string = string>(
  chainId: string,
  method: string,
  resultType: K,
  args: Codec[],
  blockHash?: HexString
) => {
  assert(
    Browser.extension.getBackgroundPage() === window,
    "@core/util/stateCall cannot be called from front end, use @ui/util/stateCall"
  )

  // on a state call there are always arguments
  const registry = args[0].registry

  const bytes = registry.createType("Raw", u8aConcatStrict(args.map((arg) => arg.toU8a())))

  const result = await chainConnector.send(chainId, "state_call", [
    method,
    bytes.toHex(),
    blockHash,
  ])

  return registry.createType(resultType, result)
}
