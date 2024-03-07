import * as ss58 from "./ss58"

export const getSubAddress = (address: string) => {
  // decode then reencode with default prefix
  const [, pubKey] = ss58.decode(address)
  return ss58.encode(42, pubKey)
}
