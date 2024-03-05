import { SignerPayloadJSON, SignerPayloadRaw } from "@polkadot/types/types"
import { HexString } from "@polkadot/util/types"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import { AccountJsonAny, AccountType } from "extension-core"
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
    case AccountType.Dcent:
      return SignDcentSubstrate
    case AccountType.Ledger:
    case // @ts-expect-error incomplete migration, remove once migration is completed
    "HARDWARE":
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
