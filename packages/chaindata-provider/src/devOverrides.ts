import { Chain } from "./types"

export const chainDevOverrides = (chains: Chain[]): Chain[] => {
  return chains.map((chain) => {
    if (chain.id === "polkadot")
      return {
        ...chain,
        staking: [
          {
            type: "nominationPools",
            minJoinBond: "10000000000", // 1 DOT (10 decimals)
            recommendedPoolIds: [12, 16],
          },
        ],
      }

    return chain
  })
}
