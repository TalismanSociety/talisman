import { encodeAnyAddress } from "@talismn/util"

/**
 *
 * @param address substrate SS58 address
 * @param prefix prefix used to format the address
 * @returns address encoded with supplied prefix
 */
export const convertAddress = (address: string, prefix: number | null) => {
  return encodeAnyAddress(address, prefix ?? undefined)
}
