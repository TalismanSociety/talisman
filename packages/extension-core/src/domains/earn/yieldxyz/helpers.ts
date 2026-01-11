import { NetworkId } from "@talismn/chaindata-provider"
import { Networks } from "@yieldxyz/sdk"
import { fromPairs, toPairs } from "lodash-es"

import { RemoteConfigStoreData } from "../../app/types"

export const getYieldxyzNetworkIdToTalismanNetworkIdMap = (
  remoteConfig: RemoteConfigStoreData,
): Record<Networks, NetworkId> => {
  return fromPairs(
    toPairs(remoteConfig.earn.yieldxyzNetworks).filter(([yieldId]) => isYieldxyzNetworkId(yieldId)),
  ) as Record<Networks, NetworkId>
}

export const getTalismanNetworkIdToYieldxyzNetworkIdMap = (
  remoteConfig: RemoteConfigStoreData,
): Record<NetworkId, Networks> => {
  return toPairs(remoteConfig.earn.yieldxyzNetworks).reduce(
    (acc, [yieldId, talismanId]) => {
      if (isYieldxyzNetworkId(yieldId)) acc[talismanId] = yieldId
      return acc
    },
    {} as Record<NetworkId, Networks>,
  )
}

export const isYieldxyzNetworkId = (id: string): id is Networks => {
  return !!Networks[id as Networks]
}
