import { AccountJsonAny, AccountTypes } from "@core/domains/accounts/types"
import { SignerPayloadJSON, SignerPayloadRaw } from "@polkadot/types/types"
import { HexString } from "@polkadot/util/types"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import { FC, Suspense, lazy } from "react"

import { SignDcentSubstrate } from "./SignDcentSubstrate"

const SignLedgerSubstrate = lazy(() => import("./SignLedgerSubstrate"))

export type SignHardwareSubstrateProps = {
  payload: SignerPayloadRaw | SignerPayloadJSON | undefined
  fee?: string
  containerId: string | undefined
  className?: string
  onCancel?: () => void
  onSentToDevice?: (sent: boolean) => void
  onSigned: (result: { signature: HexString }) => Promise<void> | void
}

const getSignHardwareComponent = (account: AccountJsonAny | null) => {
  if (!account) return null

  switch (account?.origin) {
    case AccountTypes.DCENT:
      return SignDcentSubstrate
    case AccountTypes.LEDGER:
      return SignLedgerSubstrate
    default:
      throw new Error(`Unknown sign hardware component for account origin ${account?.origin}`)
  }
}

export const SignHardwareSubstrate: FC<SignHardwareSubstrateProps> = (props) => {
  const account = useAccountByAddress(props.payload?.address)

  const SignHardwareComponent = getSignHardwareComponent(account)

  if (!SignHardwareComponent) return null

  return (
    <Suspense fallback={null}>
      <SignHardwareComponent {...props} />
    </Suspense>
  )
}
