import { TestLayout } from "../TestLayout"
import { WagmiConfig } from "wagmi"
import { Connect } from "./Connect"
import { wagmiClient } from "./connectors"
import { SendTokens } from "./SendTokens"
import { PersonalSign } from "./PersonalSign"
import { SignTypedData } from "./SignTypedData"
import { ContractReadWrite } from "./ContractReadWrite"
import { SendERC20 } from "./SendERC20"
import { PersonalSignNftListing } from "./PersonalSignNftListing"
import { PersonalSignReversed } from "./PersonalSignReversed"

export const Ethereum = () => {
  return (
    <WagmiConfig client={wagmiClient}>
      <TestLayout title="Ethereum">
        <Connect />
        <SendTokens />
        <SendERC20 />
        <ContractReadWrite />
        <PersonalSign />
        <PersonalSignReversed />
        <PersonalSignNftListing />
        <SignTypedData />
      </TestLayout>
    </WagmiConfig>
  )
}
