import { EthereumLayout } from "../shared/EthereumLayout"
import { PersonalSign } from "./PersonalSign"
import { PersonalSignReversed } from "./PersonalSignReversed"
import { SignTypedData } from "./SignTypedData"

export const SignPage = () => {
  return (
    <EthereumLayout title="Sign">
      <PersonalSign />
      <PersonalSignReversed />
      <SignTypedData />
    </EthereumLayout>
  )
}
