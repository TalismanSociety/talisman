import { AccountJsonAny, AccountType } from "@extension/core"
import { EthSignMessageMethod } from "@extension/core"
import { HexString } from "@polkadot/util/types"
import { EvmNetworkId } from "@talismn/chaindata-provider"
import { FC, Suspense, lazy } from "react"

import SignDcentEthereum from "./SignDcentEthereum"

const SignLedgerEthereum = lazy(() => import("./SignLedgerEthereum"))

export type SignHardwareEthereumProps = {
  evmNetworkId?: EvmNetworkId
  account: AccountJsonAny
  method: EthSignMessageMethod | "eth_sendTransaction"
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
    case AccountType.Dcent:
      return SignDcentEthereum
    case AccountType.Ledger:
    case // @ts-expect-error incomplete migration, remove once migration is completed
    "HARDWARE":
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
