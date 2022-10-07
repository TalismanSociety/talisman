import { ReactNode } from "react"
import { Button } from "talisman-ui"
import { IconArrowRight } from "../../icons"
import { TestLayout } from "../TestLayout"
import { WagmiConfig, createClient } from "wagmi"
import { getDefaultProvider } from "ethers"
import { Connect } from "./Connect"
import { wagmiClient } from "./connectors"
import { SendTokens } from "./SendTokens"

export const Ethereum = () => {
  return (
    <WagmiConfig client={wagmiClient}>
      <TestLayout title="Ethereum">
        <Connect />
        <SendTokens />
      </TestLayout>
    </WagmiConfig>
  )
}
