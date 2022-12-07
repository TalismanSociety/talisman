import RpcFactory from "@core/libs/RpcFactory"
import { Codec } from "@polkadot/types-codec/types"
import { u8aConcatStrict } from "@polkadot/util"
import { HexString } from "@polkadot/util/types"

export const stateCall = async <K extends string = string>(
  chainId: string,
  method: string,
  resultType: K,
  args: Codec[],
  blockHash?: HexString
) => {
  // on a state call there are always arguments
  const registry = args[0].registry

  const bytes = registry.createType("Raw", u8aConcatStrict(args.map((arg) => arg.toU8a())))

  const result = await RpcFactory.send(chainId, "state_callAt", [method, bytes.toHex(), blockHash])

  return registry.createType(resultType, result)
}
