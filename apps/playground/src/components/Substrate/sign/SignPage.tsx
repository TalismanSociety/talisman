import { SubstrateLayout } from "../shared/SubstrateLayout"
import { SignMessage } from "./SignMessage"
import { SignMessageBig } from "./SignMessageBig"

export const SignPage = () => {
  return (
    <SubstrateLayout title="Sign">
      <SignMessage />
      <SignMessageBig />
    </SubstrateLayout>
  )
}
