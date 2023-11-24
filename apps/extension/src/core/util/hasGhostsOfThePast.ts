import { hasErc721Nft } from "./hasErc721Nft"

const moonbeamEvmNetworkId = "1284"
const contractAddress = "0xDF67E64DC198E5287a6a625a4733841bD147E584"

export const hasGhostsOfThePast = () =>
  hasErc721Nft({
    evmNetworkId: moonbeamEvmNetworkId,
    contractAddress,
  })
