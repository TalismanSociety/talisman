import { ExtDef } from "@polkadot/types/extrinsic/signedExtensions/types"
import { ChainId } from "@talismn/chaindata-provider"

const USER_EXTENSIONS: Record<ChainId, ExtDef> = {
  "avail-goldberg-testnet": {
    CheckAppId: {
      extrinsic: {
        appId: "AvailCoreAppId",
      },
      payload: {},
    },
  },
  "avail-turing-testnet": {
    CheckAppId: {
      extrinsic: {
        appId: "AvailCoreAppId",
      },
      payload: {},
    },
  },
  "avail": {
    CheckAppId: {
      extrinsic: {
        appId: "AvailCoreAppId",
      },
      payload: {},
    },
  },
}

export const getUserExtensionsByChainId = (
  chainId: ChainId | null | undefined
): ExtDef | undefined => {
  return chainId ? USER_EXTENSIONS[chainId] : undefined
}
