import { toHex } from "@polkadot-api/utils"
import {
  type SubPsp22Token,
  SubPsp22TokenSchema,
  subPsp22TokenId,
} from "@talismn/chaindata-provider"
import { values } from "lodash-es"

import log from "../../log"
import type { IBalanceModule } from "../../types/IBalanceModule"
import type { MODULE_TYPE, TokenConfig } from "./config"
import { encodePsp22Message, makeContractCaller } from "./util"

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

      const [symbolResult, decimalsResult] = await Promise.all([
        contractCall(contractAddress, contractAddress, encodePsp22Message.tokenSymbol()),
        contractCall(contractAddress, contractAddress, encodePsp22Message.tokenDecimals()),
      ])

      if (symbolResult.result.success) {
        const data = symbolResult.result.value.data
        if (!data.length) throw new Error("Empty token_symbol response")
        // utf8-decode the raw return data, then strip non-printable characters
        // (drops the SCALE framing bytes: Ok tag, Option tag and compact length prefix)
        symbol = new TextDecoder().decode(data).replace(/\p{C}/gu, "")
      }

      if (decimalsResult.result.success) {
        // interpret the whole return data (Ok tag included) as a big-endian number
        decimals = Number(toHex(decimalsResult.result.value.data))
      }

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
