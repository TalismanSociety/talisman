import { isAddressEqual, normalizeAddress } from "@talismn/crypto"

import { SubscribableStorageProvider } from "../../libs/Store"
import { ConfirmedExternalAddresses } from "./types"

class ConfirmedAddressesStore extends SubscribableStorageProvider<
  ConfirmedExternalAddresses,
  "pri(sendFunds.confirmedAddresses.subscribe)"
> {
  constructor() {
    super("confirmedAddresses", {})
  }

  async addConfirmedAddress(tokenId: string, address: string): Promise<void> {
    const normalized = normalizeAddress(address)

    await this.mutate((current) => {
      const existingForToken = current[tokenId] ?? []

      if (existingForToken.some((a) => isAddressEqual(a, normalized))) {
        return current
      }

      return {
        ...current,
        [tokenId]: [...existingForToken, normalized],
      }
    })
  }
}

export const confirmedAddressesStore = new ConfirmedAddressesStore()

export const confirmedAddresses$ = confirmedAddressesStore.observable

export const addConfirmedAddress = (tokenId: string, address: string): Promise<void> =>
  confirmedAddressesStore.addConfirmedAddress(tokenId, address)

export const isAddressConfirmedForToken = (
  data: ConfirmedExternalAddresses,
  tokenId: string,
  address: string,
): boolean => {
  const confirmedForToken = data[tokenId] ?? []
  return confirmedForToken.some((confirmed) => isAddressEqual(confirmed, address))
}
