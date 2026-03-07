import type { Account, AccountOfType } from "@core/domains/keyring/exports"
import type { EthSignMessageMethod } from "@core/domains/signing/types"
import type { HexString } from "@polkadot/util/types"
import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import type { EthNetworkId } from "@talismn/chaindata-provider"
import { type FC, Suspense } from "react"

import { SignLedgerEthereum } from "./SignLedgerEthereum"

export type SignHardwareEthereumProps = {
  evmNetworkId?: EthNetworkId
  account: AccountOfType<"ledger-ethereum">
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
