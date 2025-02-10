import { HexString } from "@polkadot/util/types"
import { EvmNetworkId } from "@talismn/chaindata-provider"
import { FC, Suspense } from "react"

import { Account, EthSignMessageMethod } from "@extension/core"
import { SuspenseTracker } from "@talisman/components/SuspenseTracker"

import { SignLedgerEthereum } from "./SignLedgerEthereum"

export type SignHardwareEthereumProps = {
  evmNetworkId?: EvmNetworkId
  account: Account
  method: EthSignMessageMethod | "eth_sendTransaction"
  payload: unknown // string message, typed object for eip712, TransactionRequest for tx
  containerId?: string
  className?: string
  onSigned?: ({ signature }: { signature: HexString }) => void | Promise<void>
  onCancel?: () => void
  onSentToDevice?: (sent: boolean) => void // triggered when tx is sent to the device, or when response is received
}

const getSignHardwareComponent = (account: Account | null) => {
  if (!account) return null

  switch (account?.type) {
    // case LegacyAccountOrigin.Dcent:
    //   return SignDcentUnsupportedMessage
    case "ledger-ethereum":
      return SignLedgerEthereum
    default:
      throw new Error(`Unknown sign hardware component for account type ${account?.type}`)
  }
}

export const SignHardwareEthereum: FC<SignHardwareEthereumProps> = (props) => {
  const SignHardwareComponent = getSignHardwareComponent(props.account)

  if (!SignHardwareComponent || !props.payload) return null

  return (
    <Suspense fallback={<SuspenseTracker name="SignHardwareEthereum" />}>
      <SignHardwareComponent {...props} />
    </Suspense>
  )
}
