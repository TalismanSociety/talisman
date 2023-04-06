export const isEthereumAddress = (address: string) =>
  address.startsWith("0x") && address.length === 42
