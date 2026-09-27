import { activeNetworksStore } from "@core/domains/chaindata/store.activeNetworks"
import { activeTokensStore } from "@core/domains/chaindata/store.activeTokens"
import { getToken$ } from "@ui/state/chaindata"
import { firstValueFrom } from "rxjs"

import type { RampsFormSharedData } from "../shared/types"
import { type RampsFormData, useRampsForm } from "../shared/useRampsForm"
import { useRampsBuyCurrencies } from "./useRampsBuyCurrencies"
import { useRampsBuyQuotes } from "./useRampsBuyQuotes"
import { useRampsBuyTokens } from "./useRampsBuyTokens"

const ensureTokenEnabled = async ({ tokenId }: RampsFormData) => {
  const token = await firstValueFrom(getToken$(tokenId))
  if (!token) return

  await activeTokensStore.setActive(tokenId, true)
  await activeNetworksStore.setActive(token.networkId, true)
}

export const useRampsBuyForm = (defaults: RampsFormSharedData) =>
  useRampsForm(defaults, {
    useCurrencies: useRampsBuyCurrencies,
    useTokens: useRampsBuyTokens,
    useQuotes: useRampsBuyQuotes,
    beforeRedirect: ensureTokenEnabled,
  })
