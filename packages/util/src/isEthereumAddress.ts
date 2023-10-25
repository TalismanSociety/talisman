export const isEthereumAddress = (address: string): address is `0x${string}` =>
  address.startsWith("0x") && address.length === 42
