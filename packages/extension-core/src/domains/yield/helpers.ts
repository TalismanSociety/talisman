import { NetworkId } from "@talismn/chaindata-provider"
import { Networks } from "@yieldxyz/sdk"
import { fromPairs, toPairs } from "lodash-es"

import { RemoteConfigStoreData } from "../app/types"

export const getYieldNetworkIdToTalismanNetworkIdMap = (
  remoteConfig: RemoteConfigStoreData,
): Record<Networks, NetworkId> => {
  return fromPairs(
    toPairs(remoteConfig.earn.yieldxyzNetworks).filter(([yieldId]) => isYieldNetworkId(yieldId)),
  ) as Record<Networks, NetworkId>
}

export const getTalismanNetworkIdToYieldNetworkIdMap = (
  remoteConfig: RemoteConfigStoreData,
): Record<NetworkId, Networks> => {
  return toPairs(remoteConfig.earn.yieldxyzNetworks).reduce(
    (acc, [yieldId, talismanId]) => {
      if (isYieldNetworkId(yieldId)) acc[talismanId] = yieldId
      return acc
    },
    {} as Record<NetworkId, Networks>,
  )
}

export const isYieldNetworkId = (id: string): id is Networks => {
  return !!Networks[id as Networks]
}
