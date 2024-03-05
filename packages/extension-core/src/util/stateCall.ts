import { Codec } from "@polkadot/types-codec/types"
import type { DetectCodec } from "@polkadot/types/types"
import { u8aConcatStrict } from "@polkadot/util"
import { HexString } from "@polkadot/util/types"
import { Err, Ok, Result } from "ts-results"
import Browser from "webextension-polyfill"

import { chainConnector } from "../rpcs/chain-connector"

const INCORRECT_USAGE_ERROR =
  "@core/util/stateCall cannot be called from front end, use @ui/util/stateCall" as const

export const stateCall = async <K extends string = string>(
  chainId: string,
  method: string,
  resultType: K,
  args: Codec[],
  blockHash?: HexString
): Promise<
  Result<DetectCodec<Codec, K>, "Unable to create type" | typeof INCORRECT_USAGE_ERROR | string>
> => {
  if (Browser.extension.getBackgroundPage() !== window) return Err(INCORRECT_USAGE_ERROR)

  try {
    // on a state call there are always arguments
    const registry = args[0].registry

    const bytes = registry.createType("Raw", u8aConcatStrict(args.map((arg) => arg.toU8a())))

    const result = await chainConnector.send(chainId, "state_call", [
      method,
      bytes.toHex(),
      blockHash,
    ])

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
