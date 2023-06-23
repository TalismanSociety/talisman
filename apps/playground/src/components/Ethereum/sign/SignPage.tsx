import { EthereumLayout } from "../shared/EthereumLayout"
import { PersonalSign } from "./PersonalSign"
import { PersonalSignBig } from "./PersonalSignBig"
import { PersonalSignReversed } from "./PersonalSignReversed"
import { SignTypedData } from "./SignTypedData"

export const SignPage = () => {
  return (
    <EthereumLayout title="Sign">
      <PersonalSign />
      <PersonalSignBig />
      <PersonalSignReversed />
      <SignTypedData />
    </EthereumLayout>
  )
}
