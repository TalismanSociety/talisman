import { BuyTokensWizardProvider, useBuyTokensWizard } from "../useBuyTokensWizard"
import { BuyTokensAccountPicker } from "./form/BuyTokensAccountPicker"
import { BuyTokensForm } from "./form/BuyTokensForm"
import { BuyTokensTokenPicker } from "./form/BuyTokensTokenPicker"

const Routes = () => {
  const { route } = useBuyTokensWizard()

  switch (route) {
    case "mainForm":
      return <BuyTokensForm />
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
