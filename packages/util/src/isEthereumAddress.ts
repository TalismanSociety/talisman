export const isEthereumAddress = (address: string | undefined | null): address is `0x${string}` =>
  !!address && address.startsWith("0x") && address.length === 42
