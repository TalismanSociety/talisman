import { BuyTokensWizardProvider, useBuyTokensWizard } from "../useBuyTokensWizard"
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
      return <div>pickWallet</div>
  }
}

export const BuyTokensWizard = () => {
  return (
    <BuyTokensWizardProvider>
      <Routes />
    </BuyTokensWizardProvider>
  )
}
