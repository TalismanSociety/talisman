import { BuyTokensWizardProvider, useBuyTokensWizard } from "../useBuyTokensWizard"
import { BuyTokensForm } from "./form/BuyTokensForm"

const Routes = () => {
  const { route } = useBuyTokensWizard()

  switch (route) {
    case "mainForm":
      return <BuyTokensForm />
    case "pickToken":
      return <div>pickToken</div>
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
