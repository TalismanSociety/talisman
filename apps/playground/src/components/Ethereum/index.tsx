import { WagmiConfig } from "wagmi"

import { TestLayout } from "../TestLayout"
import { Connect } from "./Connect"
import { wagmiClient } from "./connectors"
import { ContractReadWrite } from "./ContractReadWrite"
import { PersonalSign } from "./PersonalSign"
import { PersonalSignNftListing } from "./PersonalSignNftListing"
import { PersonalSignReversed } from "./PersonalSignReversed"
import { SendERC20 } from "./SendERC20"
import { SendTokens } from "./SendTokens"
import { SignTypedData } from "./SignTypedData"

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
