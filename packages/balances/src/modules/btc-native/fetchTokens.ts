import {
  type BtcNativeToken,
  BtcNativeTokenSchema,
  btcNativeTokenId,
} from "@talismn/chaindata-provider"
import { assign } from "lodash-es"

import log from "../../log"
import type { IBalanceModule } from "../../types/IBalanceModule"
import { MODULE_TYPE, PLATFORM, type TokenConfig } from "./config"

export const fetchTokens: IBalanceModule<typeof MODULE_TYPE, TokenConfig>["fetchTokens"] = async ({
  networkId,
  tokens,
}) => {
  // assume there is one and only one token in the array
  if (tokens.length !== 1)
    throw new Error(
      "BTC Native module expects the nativeCurrency to be passed as a single token in the array"
    )

  const token = assign(
    {
      id: btcNativeTokenId(networkId),
      type: MODULE_TYPE,
      platform: PLATFORM,
      networkId,
      isDefault: true,
    },
    tokens[0] as TokenConfig
  ) as BtcNativeToken

  const parsed = BtcNativeTokenSchema.safeParse(token)
  if (!parsed.success) {
    log.warn("Ignoring token with invalid schema", token)
    return []
  }

  return [parsed.data]
}
