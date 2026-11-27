import {
  type SubGammaToken,
  SubGammaTokenSchema,
  subGammaTokenId,
} from "@talismn/chaindata-provider"

import type { IBalanceModule } from "../../types/IBalanceModule"
import { fetchGammaSubnets, type GammaSubnet } from "./chain"
import { MODULE_TYPE, PLATFORM, type SubGammaTokenConfig } from "./config"

export const toGammaToken = (
  networkId: string,
  { netuid, subnetName }: GammaSubnet
): SubGammaToken => ({
  id: subGammaTokenId(networkId, netuid),
  type: MODULE_TYPE,
  platform: PLATFORM,
  networkId,
  netuid,
  isDefault: true,
  symbol: `γSN${netuid}`,
  decimals: 9,
  name: subnetName ? `SN${netuid} ${subnetName} credits` : `SN${netuid} credits`,
  ...(subnetName && { subnetName }),
  isTransferable: false,
})

export const fetchTokens: IBalanceModule<typeof MODULE_TYPE, SubGammaTokenConfig>["fetchTokens"] =
  async ({ networkId, connector, tokens, miniMetadata }) => {
    if (!miniMetadata?.data) return []

    const subnets = await fetchGammaSubnets({
      connector,
      networkId,
      metadataRpc: miniMetadata.data,
    })

    return subnets
      .map((subnet): SubGammaToken => {
        const config = tokens.find((t) => t.netuid === subnet.netuid)
        return Object.assign(toGammaToken(networkId, subnet), config)
      })
      .filter((token) => SubGammaTokenSchema.safeParse(token).success)
  }
