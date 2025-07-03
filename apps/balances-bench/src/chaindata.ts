import { Network } from "@talismn/chaindata-provider"

import { BALANCE_MODULES } from "./IBalanceModule"

const UNKNOWN = null as unknown

const doTheChaindataThing = async () => {
  //   const dotConnector = UNKNOWN as ChainConnector
  //   const ethConnector = UNKNOWN as ChainConnectorEvm

  for (const network of UNKNOWN as Network[]) {
    for (const _mod of BALANCE_MODULES.filter((m) => m.platform === network.platform)) {
      //   if (mod.platform === "polkadot") {
      //     const config = network.balancesConfig?.[mod.type]
      //     const metadataRpc = UNKNOWN as `0x${string}`
      //     const miniMetadata = mod.getMiniMetadata({
      //         networkId: network.id,
      //         connector: dotConnector,
      //         config
      //     })
      //     // await mod.fetchTokens({
      //     //   networkId: network.id,
      //     //   tokens: [],
      //     //   connector: dotConnector,
      //     //   cache: {},
      //     // })
      //   } else if (mod.platform === "ethereum") {
      //     // await mod.fetchTokens({
      //     //   networkId: network.id,
      //     //   tokens: [],
      //     //   connector: ethConnector,
      //     //   cache: {},
      //     // })
      //   }
    }
  }
}

doTheChaindataThing()
