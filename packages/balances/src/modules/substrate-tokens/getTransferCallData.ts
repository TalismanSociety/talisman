import { mergeUint8 } from "@polkadot-api/utils"
import { isTokenOfType, SubTokensToken } from "@talismn/chaindata-provider"
import { MetadataBuilder, papiParse, parseMetadataRpc } from "@talismn/scale"
import { Binary, Enum } from "polkadot-api"

import { BalanceTransferType, IBalanceModule } from "../../types/IBalanceModule"
import { MODULE_TYPE, ModuleConfig, TokenConfig } from "./config"

export const getTransferCallData: IBalanceModule<
  typeof MODULE_TYPE,
  TokenConfig,
  ModuleConfig
>["getTransferCallData"] = ({ from, to, value, token, type, metadataRpc, config }) => {
  if (!isTokenOfType(token, MODULE_TYPE))
    throw new Error(`Token type ${token.type} is not ${MODULE_TYPE}.`)

  const { builder } = parseMetadataRpc(metadataRpc)

  // each chain has its own way of encoding the transfer call data
  // let's try our luck until one works!
  const options = getCallDataOptions(to, token, value, type, config)
  const callData = getCallDataFromOptions(builder, options)

  return {
    address: from,
    method: callData.asHex() as `0x${string}`,
  }
}

const getTransferMethod = (type: BalanceTransferType) => {
  switch (type) {
    case "keep-alive":
      return "transfer_keep_alive"
    case "all":
      return "transfer_all"
    case "allow-death":
      return "transfer"
  }
}

type CallDataOption = {
  pallet: string
  method: string
  getArgs: () => unknown
}

const getCallDataFromOptions = (builder: MetadataBuilder, options: CallDataOption[]): Binary => {
  for (const { pallet, method, getArgs } of options) {
    try {
      return buildCallData(builder, pallet, method, getArgs())
    } catch {
      // wrong inputs, ignore and try the next one
    }
  }
  throw new Error("Failed to encode call data")
}

const buildCallData = (builder: MetadataBuilder, pallet: string, method: string, args: unknown) => {
  const { location, codec } = builder.buildCall(pallet, method)
  return Binary.fromBytes(mergeUint8([new Uint8Array(location), codec.enc(args)]))
}

const getCallDataOptions = (
  to: string,
  token: SubTokensToken,
  value: string,
  type: BalanceTransferType,
  config: ModuleConfig | undefined,
): CallDataOption[] => {
  const onChainId = papiParse(token.onChainId)
  const method = getTransferMethod(type)

  return [
    {
      pallet: "Currencies",
      method: "transfer",
      getArgs: () => ({
        dest: Enum("Id", to),
        currency_id: onChainId,
        amount: BigInt(value),
      }),
    },
    {
      pallet: "Currencies",
      method: "transfer",
      getArgs: () => ({
        dest: to,
        currency_id: onChainId,
        amount: BigInt(value),
      }),
    },
    {
      pallet: "Tokens",
      method,
      getArgs: () =>
        method === "transfer_all"
          ? {
              dest: Enum("Id", to),
              currency_id: onChainId,
              keepAlive: false,
            }
          : {
              dest: Enum("Id", to),
              currency_id: onChainId,
              amount: BigInt(value),
            },
    },
    {
      pallet: "Tokens",
      method,
      getArgs: () =>
        method === "transfer_all"
          ? {
              dest: to,
              currency_id: onChainId,
              keepAlive: false,
            }
          : {
              dest: to,
              currency_id: onChainId,
              amount: BigInt(value),
            },
    },
  ].concat(
    ...(config?.palletId
      ? [
          {
            pallet: config.palletId,
            method,
            getArgs: () =>
              method === "transfer_all"
                ? {
                    dest: Enum("Id", to),
                    currency_id: onChainId,
                    keepAlive: false,
                  }
                : {
                    dest: Enum("Id", to),
                    currency_id: onChainId,
                    amount: BigInt(value),
                  },
          },
          {
            pallet: config.palletId,
            method,
            getArgs: () =>
              method === "transfer_all"
                ? {
                    dest: to,
                    currency_id: onChainId,
                    keepAlive: false,
                  }
                : {
                    dest: to,
                    currency_id: onChainId,
                    amount: BigInt(value),
                  },
          },
        ]
      : []),
  )
}
