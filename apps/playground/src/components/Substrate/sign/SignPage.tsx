import { SubstrateLayout } from "../shared/SubstrateLayout"
import { SignMessage } from "./SignMessage"

export const SignPage = () => {
  return (
    <SubstrateLayout title="Sign">
      <SignMessage />
    </SubstrateLayout>
  )
}
