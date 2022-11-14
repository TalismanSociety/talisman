import { assert, hexAddPrefix, hexStripPrefix, u8aConcatStrict } from "@polkadot/util"
import { GenericExtrinsic } from "@polkadot/types"
import { HexString } from "@polkadot/util/types"
import RpcFactory from "@core/libs/RpcFactory"
import { Codec } from "@polkadot/types-codec/types"

const USE_WEIGHT_V2 = true

type IRuntimeDispatchInfo = {
  partialFee: string
}

const stateCall = async <T extends Codec>(
  chainId: string,
  method: string,
  resultType: string,
  args: Codec[],
  blockHash?: HexString
): Promise<T | Codec> => {
  const registry = args[0].registry

  const bytes = registry.createType("Raw", u8aConcatStrict(args.map((arg) => arg.toU8a())))

  const result = await RpcFactory.send(chainId, "state_call", [method, bytes.toHex(), blockHash])

  return registry.createType<T>(resultType, result)
}

export const getExtrinsicDispatchInfo = async (
  chainId: string,
  signedExtrinsic: GenericExtrinsic,
  blockHash?: HexString
): Promise<IRuntimeDispatchInfo> => {
  assert(signedExtrinsic.isSigned, "Extrinsic must be signed (or fakeSigned) in order to query fee")

  if (USE_WEIGHT_V2) {
    const u8a = signedExtrinsic.toU8a()
    const len = signedExtrinsic.registry.createType("u32", u8a.length)

    const bytes = signedExtrinsic.registry.createType(
      "Raw",
      u8aConcatStrict([signedExtrinsic.toU8a(), len.toU8a()])
    )

    const queryInfoRaw = await RpcFactory.send(chainId, "state_call", [
      "TransactionPaymentApi_query_info",
      bytes.toHex(),
      blockHash,
    ])

    const decoded = signedExtrinsic.registry.createType("RuntimeDispatchInfo", queryInfoRaw)
    // console.log({ decoded, human: decoded.toHuman() })

    return { partialFee: decoded.partialFee.toString() }
  } else {
    return RpcFactory.send(chainId, "payment_queryInfo", [signedExtrinsic.toHex(), blockHash])
  }
}
