import { mergeUint8 } from "@polkadot-api/utils"
import { isTokenOfType } from "@talismn/chaindata-provider"
import { parseMetadataRpc } from "@talismn/scale"
import { Binary, Codec, Enum } from "polkadot-api"

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

  const { builder } = parseMetadataRpc(metadataRpc)
  const method = getTransferMethod(type)
  const { codec, location } = builder.buildCall("Assets", method)
  const args = getEncodedArgs(method, token.assetId, to, value, codec)
  const callData = Binary.fromBytes(mergeUint8([new Uint8Array(location), args]))

  return {
    address: from,
    method: callData.asHex() as `0x${string}`,
  }
}

const getTransferMethod = (type: BalanceTransferType) => {
  // TODO handle the case where transfer_all does not exist
  switch (type) {
    case "keep-alive":
      return "transfer_keep_alive"
    case "all":
      return "transfer_all"
    case "allow-death":
      return "transfer"
  }
}

const getEncodedArgs = (
  method: ReturnType<typeof getTransferMethod>,
  assetId: string,
  to: string,
  value: string,
  argsCodec: Codec<unknown>,
): Uint8Array => {
  try {
    switch (method) {
      case "transfer_keep_alive":
      case "transfer":
        return getTransferEncodedArgs(assetId, to, value, argsCodec)
      case "transfer_all":
        return getTransferAllEncodedArgs(assetId, to, argsCodec)
    }
  } catch {
    throw new Error(`Failed to encode arguments for method ${method}: ${assetId}, ${to}, ${value}`)
  }
}

const getEncodedValue = (codec: Codec<unknown>, possibleValue: Array<() => unknown>) => {
  for (const getArgs of possibleValue) {
    try {
      return codec.enc(getArgs())
    } catch (error) {
      // wrong inputs, ignore and try the next one
    }
  }

  throw new Error("Failed to encode")
}

// same inputs for both KeepAlive and allowDeath
const getTransferEncodedArgs = (
  assetId: string,
  to: string,
  value: string,
  codec: Codec<unknown>,
) => {
  return getEncodedValue(codec, [
    () => ({
      id: Number(assetId), // for most networks
      target: Enum("Id", to),
      amount: BigInt(value),
    }),
    () => ({
      id: BigInt(assetId), // for Astar
      target: Enum("Id", to),
      amount: BigInt(value),
    }),
    () => ({
      id: BigInt(assetId), // for Neuroweb
      target: to,
      amount: BigInt(value),
    }),
  ])
}

const getTransferAllEncodedArgs = (assetId: string, to: string, codec: Codec<unknown>) => {
  return getEncodedValue(codec, [
    () => ({
      id: Number(assetId), // for most networks
      dest: Enum("Id", to),
      keep_alive: false,
    }),
    () => ({
      id: BigInt(assetId), // for Astar
      dest: Enum("Id", to),
      keep_alive: false,
    }),
    () => ({
      id: BigInt(assetId), // for Neuroweb (although transfer_all does not exist)
      dest: to,
      keep_alive: false,
    }),
  ])
}
