import { BuyTokensWizardProvider, useBuyTokensWizard } from "../useBuyTokensWizard"
import { BuyTokensAccountPicker } from "./form/routes/BuyTokensAccountPicker"
import { BuyTokensFiatPicker } from "./form/routes/BuyTokensFiatPicker"
import { BuyTokensForm } from "./form/routes/BuyTokensForm"
import { BuyTokensTokenPicker } from "./form/routes/BuyTokensTokenPicker"

const Routes = () => {
  const { route } = useBuyTokensWizard()

  switch (route) {
    case "mainForm":
      return <BuyTokensForm />
    case "pickFiat":
      return <BuyTokensFiatPicker />
    case "pickToken":
      return <BuyTokensTokenPicker />
    case "pickWallet":
      return <BuyTokensAccountPicker />
  }
}

export const BuyTokensWizard = () => {
  return (
    <BuyTokensWizardProvider>
      <Routes />
    </BuyTokensWizardProvider>
  )
}
