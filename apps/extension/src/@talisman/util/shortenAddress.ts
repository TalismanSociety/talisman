export const shortenAddress = (address: string, keepStart = 4, keepEnd = 4) => {
  if (!address) return ""
  return `${address.substring(0, keepStart)}…${address.substring(address.length - keepEnd)}`
}
