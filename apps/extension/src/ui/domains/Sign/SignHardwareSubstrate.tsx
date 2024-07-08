import { AccountJsonAny, AccountType, SubstrateLedgerAppType } from "@extension/core"
import { TypeRegistry } from "@polkadot/types"
import { SignerPayloadJSON, SignerPayloadRaw } from "@polkadot/types/types"
import { HexString } from "@polkadot/util/types"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import { FC, Suspense, lazy } from "react"

import { SignDcentSubstrate } from "./SignDcentSubstrate"

const SignLedgerSubstrateGeneric = lazy(() => import("./SignLedgerSubstrateGeneric"))
const SignLedgerSubstrateLegacy = lazy(() => import("./SignLedgerSubstrateLegacy"))

export type SignHardwareSubstrateProps = {
  payload: SignerPayloadRaw | SignerPayloadJSON | undefined
  fee?: string
  containerId: string | undefined
  className?: string
  onCancel?: () => void
  onSentToDevice?: (sent: boolean) => void
  onSigned: (result: { signature: HexString; payload?: SignerPayloadJSON }) => Promise<void> | void
  shortMetadata?: string
  registry?: TypeRegistry
}

const getSignHardwareComponent = (account: AccountJsonAny | null) => {
  if (!account) return null

  switch (account?.origin) {
    case AccountType.Dcent:
      return SignDcentSubstrate
    case AccountType.Ledger: {
      switch (account?.ledgerApp) {
        case SubstrateLedgerAppType.Generic:
          return SignLedgerSubstrateGeneric
        case SubstrateLedgerAppType.Legacy:
        default:
          return SignLedgerSubstrateLegacy
      }
    }
    default:
      throw new Error(`Unknown sign hardware account type for account origin ${account?.origin}`)
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
