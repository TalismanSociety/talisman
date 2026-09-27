import type { RampsFormSharedData } from "../shared/types"
import { useRampsForm } from "../shared/useRampsForm"
import { useRampsSellCurrencies } from "./useRampsSellCurrencies"
import { useRampsSellQuotes } from "./useRampsSellQuotes"
import { useRampsSellTokens } from "./useRampsSellTokens"

export const useRampsSellForm = (defaults: RampsFormSharedData) =>
  useRampsForm(defaults, {
    useCurrencies: useRampsSellCurrencies,
    useTokens: useRampsSellTokens,
    useQuotes: useRampsSellQuotes,
  })
