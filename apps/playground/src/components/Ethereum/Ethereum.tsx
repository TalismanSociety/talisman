import { TestLayout } from "../TestLayout"
import { WagmiConfig } from "wagmi"
import { Connect } from "./Connect"
import { wagmiClient } from "./connectors"
import { SendTokens } from "./SendTokens"
import { PersonalSign } from "./PersonalSign"
import { SignTypedData } from "./SignTypedData"

export const Ethereum = () => {
  return (
    <WagmiConfig client={wagmiClient}>
      <TestLayout title="Ethereum">
        <Connect />
        <SendTokens />
        <PersonalSign />
        <SignTypedData />
      </TestLayout>
    </WagmiConfig>
  )
}
