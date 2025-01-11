import { yupResolver } from "@hookform/resolvers/yup"
import { useState } from "react"
import { useForm } from "react-hook-form"

import { provideContext } from "@talisman/util/provideContext"
import { useDebouncedState } from "@ui/hooks/useDebouncedState"

import { useBuyTokensModal } from "./hooks/useBuyTokensModal"
import { FormData, FormRoute } from "./types"
import { schema } from "./utils/schema"

export const useBuyTokensWizardProvider = () => {
  const [route, setRoute] = useState<FormRoute>("mainForm")
  const [isBuyForm, setIsBuyForm] = useState<boolean>(true)

  const { open, close } = useBuyTokensModal()
  const [debouncedFiatAmount, setDebouncedFiatAmount] = useDebouncedState("", 300)
  const [debouncedTokenAmount, setDebouncedTokenAmount] = useDebouncedState("", 300)

  const buySellForm = useForm<FormData>({
    mode: "all",
    defaultValues: {
      dirtyAmountField: "fiatAmount",
      rampTokenAsset: {
        id: "",
        symbol: "",
        chain: "",
        chainId: "",
        decimals: 0,
        isEvm: false,
        chainPrefix: 0,
        minPurchaseAmount: 0,
      },
    },
    resolver: yupResolver(schema),
  })

  const ctx = {
    route,
    buySellForm,
    debouncedFiatAmount,
    debouncedTokenAmount,
    isBuyForm,
    setIsBuyForm,
    setDebouncedFiatAmount,
    setDebouncedTokenAmount,
    setRoute,
    open,
    close,
  }

  return ctx
}

export const [BuyTokensWizardProvider, useBuyTokensWizard] = provideContext(
  useBuyTokensWizardProvider,
)
