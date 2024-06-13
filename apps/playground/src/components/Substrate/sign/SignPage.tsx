import { SubstrateLayout } from "../shared/SubstrateLayout"
import { SignMessage } from "./SignMessage"
import { SignMessageBig } from "./SignMessageBig"
import { SignMessageQuest } from "./SignMessageQuest"

export const SignPage = () => {
  return (
    <SubstrateLayout title="Sign">
      <SignMessage />
      <SignMessageQuest />
      <SignMessageBig />
    </SubstrateLayout>
  )
}
