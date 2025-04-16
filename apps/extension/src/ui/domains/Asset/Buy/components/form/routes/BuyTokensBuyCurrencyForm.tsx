// import { useCallback } from "react"

// import { useBuyTokensWizard } from "../../../useBuyTokensWizard"
// import { BuyTokensFiatPicker } from "./BuyTokensFiatPicker"

// export const BuyTokensBuyCurrencyForm = () => {

//   const {
//     buySellForm: { watch, setValue },
//     supportedRampCurrencies,
//     setRoute,
//   } = useBuyTokensWizard()

//   const handleSelect = useCallback(
//     (code: string) => {
//       setValue("fiatCurrency", code, { shouldValidate: true })
//       //setValue("rampTokenAsset.minPurchaseAmount", minPurchaseAmount ?? 0, { shouldValidate: true })
//       setRoute("mainForm")
//     },
//     [setValue, setRoute],
//   )

//   return <BuyTokensFiatPicker currencyCodes={[]} selected="" onSelect={handleSelect} />
// }
