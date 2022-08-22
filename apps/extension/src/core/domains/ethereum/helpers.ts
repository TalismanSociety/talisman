export const getEthDerivationPath = (index = 0) => `/m/44'/60'/0'/0/${index}`

export const getErc20TokenId = (chainOrNetworkId: number | string, contractAddress: string) =>
  `${chainOrNetworkId}-erc20-${contractAddress}`.toLowerCase()
