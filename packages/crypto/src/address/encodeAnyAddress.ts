import { decodeSs58Address, detectAddressEncoding, encodeAddressSs58 } from "./encoding"
import { normalizeAddress } from "./normalizeAddress"

type EncodeAddressOptions = {
  ss58Format?: number | undefined
}

export const encodeAnyAddress = (address: string, options?: EncodeAddressOptions) => {
  // this leverages cache
  const encoding = detectAddressEncoding(address)

  // this does NOT leverage cache
  if (encoding === "ss58" && options?.ss58Format !== undefined) {
    const [publicKey] = decodeSs58Address(address)
    return encodeAddressSs58(publicKey, options?.ss58Format ?? 42)
  }

  // this leverages cache
  return normalizeAddress(address)
}
