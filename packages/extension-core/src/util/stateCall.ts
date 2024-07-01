import { TypeRegistry } from "@polkadot/types"
import { Codec } from "@polkadot/types-codec/types"
import type { DetectCodec } from "@polkadot/types/types"
import { u8aConcatStrict } from "@polkadot/util"
import { HexString } from "@polkadot/util/types"
import { Err, Ok, Result } from "ts-results"

import { chainConnector } from "../rpcs/chain-connector"

export const stateCall = async <K extends string = string>(
  chainId: string,
  method: string,
  resultType: K,
  args: Codec[],
  blockHash?: HexString,
  isCacheable?: boolean
): Promise<Result<DetectCodec<Codec, K>, "Unable to create type" | string>> => {
  try {
    // use registry from the first argument if any, in case arg is a custom type
    const registry = args.length ? args[0].registry : new TypeRegistry()

    const bytes = registry.createType(
      "Raw",
      args.length ? u8aConcatStrict(args.map((arg) => arg.toU8a())) : undefined
    )

    const result = await chainConnector.send(
      chainId,
      "state_call",
      [method, bytes.toHex(), blockHash],
      isCacheable
    )

    try {
      const createdType = registry.createType(resultType, result)
      return Ok(createdType)
    } catch (error) {
      return Err("Unable to create type")
    }
  } catch (error) {
    return Err((error as Error).message)
  }
}
