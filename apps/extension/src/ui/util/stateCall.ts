import { Codec } from "@polkadot/types-codec/types"
import { u8aConcatStrict } from "@polkadot/util"
import { HexString } from "@polkadot/util/types"
import { api } from "@ui/api"

export const stateCall = async <K extends string = string>(
  chainId: string,
  method: string,
  resultType: K,
  args: Codec[],
  blockHash?: HexString,
  isCacheable?: boolean
) => {
  // on a state call there are always arguments
  const registry = args[0].registry

  const bytes = registry.createType("Raw", u8aConcatStrict(args.map((arg) => arg.toU8a())))

  const result = await api.subSend(
    chainId,
    "state_call",
    [method, bytes.toHex(), blockHash],
    isCacheable
  )

  return registry.createType(resultType, result)
}
