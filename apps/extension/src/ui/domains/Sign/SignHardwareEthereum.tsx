import { AccountJsonAny, AccountTypes } from "@core/domains/accounts/types"
import { EthSignMessageMethod } from "@core/domains/signing/types"
import { HexString } from "@polkadot/util/types"
import { FC, Suspense, lazy } from "react"

import SignDcentEthereum from "./SignDcentEthereum"

const SignLedgerEthereum = lazy(() => import("./SignLedgerEthereum"))

export type SignHardwareEthereumProps = {
  account: AccountJsonAny
  method: EthSignMessageMethod | "eth_sendTransaction"
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: unknown // string message, typed object for eip712, TransactionRequest for tx
  containerId?: string
  className?: string
  onSigned?: ({ signature }: { signature: HexString }) => void | Promise<void>
  onCancel?: () => void
  onSentToDevice?: (sent: boolean) => void // triggered when tx is sent to the device, or when response is received
}

const getSignHardwareComponent = (account: AccountJsonAny | null) => {
  if (!account) return null

  switch (account?.origin) {
    case AccountTypes.DCENT:
      return SignDcentEthereum
    case AccountTypes.LEDGER:
      return SignLedgerEthereum
    default:
      throw new Error(`Unknown sign hardware component for account origin ${account?.origin}`)
  }
}

export const SignHardwareEthereum: FC<SignHardwareEthereumProps> = (props) => {
  const SignHardwareComponent = getSignHardwareComponent(props.account)

  if (!SignHardwareComponent || !props.payload) return null

  return (
    <Suspense fallback={null}>
      <SignHardwareComponent {...props} />
    </Suspense>
  )
}
