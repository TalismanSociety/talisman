import { mergeUint8 } from "@polkadot-api/utils"
import { isTokenOfType } from "@talismn/chaindata-provider"
import { Codec, MetadataLookup, parseMetadataRpc, UnifiedMetadata } from "@talismn/scale"
import { Binary, Enum } from "polkadot-api"

import { BalanceTransferType, IBalanceModule } from "../../types/IBalanceModule"
import { MODULE_TYPE } from "./config"

export const getTransferCallData: IBalanceModule<typeof MODULE_TYPE>["getTransferCallData"] = ({
  from,
  to,
  value,
  token,
  type,
  metadataRpc,
}) => {
  if (!isTokenOfType(token, MODULE_TYPE))
    throw new Error(`Token type ${token.type} is not ${MODULE_TYPE}.`)

  const { unifiedMetadata, lookupFn, builder } = parseMetadataRpc(metadataRpc)
  const method = getTransferMethod(type, unifiedMetadata, lookupFn)

  const { codec, location } = builder.buildCall("Balances", method)
  const args = getEncodedArgs(method, to, value, codec)
  const callData = Binary.fromBytes(mergeUint8([new Uint8Array(location), args]))

  return {
    address: from,
    method: callData.asHex() as `0x${string}`,
  }
}

const getTransferMethod = (
  type: BalanceTransferType,
  unifiedMetadata: UnifiedMetadata,
  lookupFn: MetadataLookup,
) => {
  switch (type) {
    case "keep-alive":
      return "transfer_keep_alive"
    case "all":
      return "transfer_all"
    case "allow-death": {
      const callType = unifiedMetadata.pallets.find((pallet) => pallet.name === "Balances")?.calls
        ?.type

      if (callType) {
        const palletCalls = lookupFn(callType)
        if (palletCalls.type === "enum" && palletCalls.value["transfer_allow_death"])
          return "transfer_allow_death"
      }

      // legacy fallback
      return "transfer"
    }
  }
}

const getEncodedArgs = (
  method: ReturnType<typeof getTransferMethod>,
  to: string,
  value: string,
  argsCodec: Codec<unknown>,
): Uint8Array => {
  try {
    switch (method) {
      case "transfer_allow_death":
      case "transfer_keep_alive":
      case "transfer":
        return getTransferEncodedArgs(to, value, argsCodec)
      case "transfer_all":
        return getTransferAllEncodedArgs(to, argsCodec)
    }
  } catch {
    throw new Error(`Failed to encode arguments for method ${method}, ${to}, ${value}`)
  }
}

const getEncodedValue = (codec: Codec<unknown>, possibleValue: Array<() => unknown>) => {
  for (const getArgs of possibleValue) {
    try {
      return codec.enc(getArgs())
    } catch {
      // wrong inputs, ignore and try the next one
    }
  }

  throw new Error("Failed to encode")
}

// same inputs for both KeepAlive and allowDeath
const getTransferEncodedArgs = (to: string, value: string, codec: Codec<unknown>) => {
  return getEncodedValue(codec, [
    () => ({
      dest: Enum("Id", to),
      value: BigInt(value),
    }),
    () => ({
      dest: to, // ex: native MYTH on Mythos
      value: BigInt(value),
    }),
  ])
}

const getTransferAllEncodedArgs = (to: string, codec: Codec<unknown>) => {
  return getEncodedValue(codec, [
    () => ({
      dest: Enum("Id", to),
      keep_alive: false,
    }),
    () => ({
      dest: to,
      keep_alive: false,
    }),
  ])
}
