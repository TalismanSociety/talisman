import {
  type SubPsp22Token,
  SubPsp22TokenSchema,
  subPsp22TokenId,
} from "@talismn/chaindata-provider"
import { values } from "lodash-es"

import log from "../../log"
import type { IBalanceModule } from "../../types/IBalanceModule"
import { encodePsp22Message } from "./codec"
import type { MODULE_TYPE, TokenConfig } from "./config"
import { makeContractCaller } from "./util"

const u8aToString = (value: Uint8Array): string => new TextDecoder().decode(value)

/**
 * Decode an Option<Vec<u8>> from raw contract result data.
 * The format is: 0x01 (Some) + Compact<length> + bytes, or 0x00 (None).
 */
const decodeOptionVecU8 = (data: Uint8Array): Uint8Array | null => {
  if (data.length === 0 || data[0] === 0) return null
  let offset = 1
  const first = data[offset]
  let length: number
  if ((first & 0b11) === 0) {
    length = first >> 2
    offset += 1
  } else if ((first & 0b11) === 1) {
    length = (data[offset] | (data[offset + 1] << 8)) >> 2
    offset += 2
  } else if ((first & 0b11) === 2) {
    length =
      (data[offset] |
        (data[offset + 1] << 8) |
        (data[offset + 2] << 16) |
        (data[offset + 3] << 24)) >>>
      2
    offset += 4
  } else {
    return null
  }
  return data.slice(offset, offset + length)
}

export const fetchTokens: IBalanceModule<typeof MODULE_TYPE, TokenConfig>["fetchTokens"] = async ({
  networkId,
  tokens,
  connector,
}) => {
  if (!tokens.length) return []

  const contractCall = makeContractCaller({
    chainConnector: connector,
    chainId: networkId,
  })

  const tokenList: Record<string, SubPsp22Token> = {}

  for (const tokenConfig of tokens ?? []) {
    try {
      let symbol = tokenConfig?.symbol ?? "Unit"
      let decimals = tokenConfig?.decimals ?? 0
      const contractAddress = tokenConfig?.contractAddress ?? undefined

      if (contractAddress === undefined) continue

      await (async () => {
        const [symbolResult, decimalsResult] = await Promise.all([
          contractCall(
            contractAddress,
            contractAddress,
            encodePsp22Message("PSP22Metadata::token_symbol")
          ),
          contractCall(
            contractAddress,
            contractAddress,
            encodePsp22Message("PSP22Metadata::token_decimals")
          ),
        ])

        if (symbolResult.result.success) {
          const decoded = decodeOptionVecU8(symbolResult.result.data)
          if (decoded) symbol = u8aToString(decoded).replace(/\p{C}/gu, "")
        }

        if (decimalsResult.result.success && decimalsResult.result.data.length > 0) {
          // Decimals is returned as a u8 value
          decimals = decimalsResult.result.data[0]
        }
      })()

      const id = subPsp22TokenId(networkId, contractAddress)
      const token: SubPsp22Token = {
        id,
        type: "substrate-psp22",
        platform: "polkadot",
        isDefault: tokenConfig.isDefault ?? true,
        symbol,
        decimals,
        name: tokenConfig?.name || symbol,
        logo: tokenConfig?.logo,
        contractAddress,
        networkId,
      }

      if (tokenConfig?.coingeckoId) token.coingeckoId = tokenConfig?.coingeckoId
      if (tokenConfig?.mirrorOf) token.mirrorOf = tokenConfig?.mirrorOf

      tokenList[token.id] = token
    } catch (error) {
      log.error(
        `Failed to build substrate-psp22 token ${tokenConfig.contractAddress} (${tokenConfig.symbol}) on ${networkId}`,
        (error as Error)?.message ?? error
      )
    }
  }

  return values(tokenList).filter((t) => {
    const parsed = SubPsp22TokenSchema.safeParse(t)
    // if (!parsed.success) log.warn(`Ignoring invalid token ${MODULE_TYPE}`, t)

    return parsed.success
  })
}
