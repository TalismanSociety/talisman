import { Abi } from "@polkadot/api-contract"
import { TypeRegistry } from "@polkadot/types"
import {
  type SubPsp22Token,
  SubPsp22TokenSchema,
  subPsp22TokenId,
} from "@talismn/chaindata-provider"
import { values } from "lodash-es"

import log from "../../log"
import type { IBalanceModule } from "../../types/IBalanceModule"
import psp22Abi from "../abis/psp22.json"
import type { MODULE_TYPE, TokenConfig } from "./config"
import { makeContractCaller } from "./util"

const hexToNumber = (hex: string): number => Number(hex)
const u8aToString = (value: Uint8Array): string => new TextDecoder().decode(value)

export const fetchTokens: IBalanceModule<typeof MODULE_TYPE, TokenConfig>["fetchTokens"] = async ({
  networkId,
  tokens,
  connector,
}) => {
  if (!tokens.length) return []

  const registry = new TypeRegistry()
  const Psp22Abi = new Abi(psp22Abi)

  // TODO: Use `decodeOutput` from `./util/decodeOutput`
  const contractCall = makeContractCaller({
    chainConnector: connector,
    chainId: networkId,
    registry,
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
            Psp22Abi.findMessage("PSP22Metadata::token_symbol").toU8a([])
          ),
          contractCall(
            contractAddress,
            contractAddress,
            Psp22Abi.findMessage("PSP22Metadata::token_decimals").toU8a([])
          ),
        ])

        // biome-ignore lint/suspicious/noExplicitAny: legacy
        const symbolData = (symbolResult.toJSON()?.result as any)?.ok?.data
        symbol =
          typeof symbolData === "string" && symbolData.startsWith("0x")
            ? u8aToString(
                registry.createType(
                  "Option<Vec<u8>>",
                  // biome-ignore lint/suspicious/noExplicitAny: legacy
                  (symbolResult.toJSON()?.result as any)?.ok?.data
                )?.value
              )?.replace(/\p{C}/gu, "")
            : symbol

        // biome-ignore lint/suspicious/noExplicitAny: legacy
        const decimalsData = (decimalsResult.toJSON()?.result as any)?.ok?.data
        decimals =
          typeof decimalsData === "string" && decimalsData.startsWith("0x")
            ? hexToNumber(decimalsData)
            : decimals
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
