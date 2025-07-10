import { SubTokensToken, subTokensTokenId } from "@talismn/chaindata-provider"
import { assign } from "lodash-es"

import { IBalanceModule } from "../../types/IBalanceModule"
import { MODULE_TYPE, PLATFORM, TokenConfig } from "./config"

export const fetchTokens: IBalanceModule<typeof MODULE_TYPE, TokenConfig>["fetchTokens"] = async ({
  networkId,
  tokens,
  miniMetadata,
}) => {
  if (!miniMetadata?.data) return []

  // in this module we do not fetch any token information from the chain
  // this is because there are basically as many pallet implementations as there are networks (Expect Chaos, they said)
  // we rely on the config to provide all the info we need
  return tokens.map(
    (tokenConfig): SubTokensToken =>
      assign(
        {
          id: subTokensTokenId(networkId, tokenConfig.onChainId),
          type: MODULE_TYPE,
          platform: PLATFORM,
          networkId,
          onChainId: tokenConfig.onChainId,
          symbol: tokenConfig.symbol ?? "Unit",
          decimals: tokenConfig.decimals ?? 0,
          name: tokenConfig.name ?? tokenConfig.symbol ?? "Unit",
          existentialDeposit: tokenConfig.existentialDeposit ?? "0",
          isDefault: true,
        },
        tokenConfig,
      ),
  )
}
