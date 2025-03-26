import { TypeRegistry } from "@polkadot/types"
import { SignerPayloadJSON, SignerPayloadRaw } from "@polkadot/types/types"
import { HexString } from "@polkadot/util/types"
import { Account } from "extension-core"
import { FC } from "react"

import { useAccountByAddress } from "@ui/state"

import { SignLedgerSubstrateGeneric } from "./SignLedgerSubstrateGeneric"
import { SignLedgerSubstrateLegacy } from "./SignLedgerSubstrateLegacy"

export type SignHardwareSubstrateProps = {
  payload: SignerPayloadRaw | SignerPayloadJSON | undefined
  fee?: string
  containerId?: string | undefined
  className?: string
  onCancel?: () => void
  onSentToDevice?: (sent: boolean) => void
  onSigned: (result: { signature: HexString; payload?: SignerPayloadJSON }) => Promise<void> | void
  shortMetadata?: string
  registry?: TypeRegistry
}

const getSignHardwareComponent = (account: Account | null) => {
  if (!account) return null

  switch (account?.type) {
    case "ledger-polkadot":
      return account.genesisHash ? SignLedgerSubstrateLegacy : SignLedgerSubstrateGeneric

    default:
      throw new Error(`Unknown sign hardware account type for account type ${account?.type}`)
  }
}

export const SignHardwareSubstrate: FC<SignHardwareSubstrateProps> = (props) => {
  const account = useAccountByAddress(props.payload?.address)

  const SignHardwareComponent = getSignHardwareComponent(account)

  if (!SignHardwareComponent) return null

  return <SignHardwareComponent {...props} />
}
