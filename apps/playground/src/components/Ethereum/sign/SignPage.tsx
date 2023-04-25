import { EthereumLayout } from "../shared/EthereumLayout"
import { PersonalSign } from "./PersonalSign"
import { PersonalSignNftListing } from "./PersonalSignNftListing"
import { PersonalSignReversed } from "./PersonalSignReversed"
import { SignTypedData } from "./SignTypedData"

export const SignPage = () => {
  return (
    <EthereumLayout title="Sign">
      <PersonalSign />
      <PersonalSignReversed />
      <PersonalSignNftListing />
      <SignTypedData />
    </EthereumLayout>
  )
}
