export const shortenAddress = (address?: string, keepStart: number = 4, keepEnd: number = 4) => {
  if (!address) return ""
  return `${address.substring(0, keepStart)}…${address.substring(address.length - keepEnd)}`
}
