import type { Account } from "@core/domains/keyring/exports"
import type { SignerPayloadJSON, SignerPayloadRaw } from "@core/types/pjsInterop"
import type { HexString } from "@talismn/util"
import type { ButtonProps } from "@ui/components/Button"
import { useAccountByAddress } from "@ui/state/accounts"
import type { FC } from "react"
import { SignLedgerSubstrateGeneric } from "./SignLedgerSubstrateGeneric"
import { SignLedgerSubstrateLegacy } from "./SignLedgerSubstrateLegacy"

export type SignHardwareSubstrateProps = {
  payload: SignerPayloadRaw | SignerPayloadJSON | undefined
  fee?: string
  containerId?: string | undefined
  className?: string
  disabled?: boolean
  onCancel?: () => void
  onSentToDevice?: (sent: boolean) => void
  onSigned: (result: { signature: HexString; payload?: SignerPayloadJSON }) => Promise<void> | void
  shortMetadata?: string
  color?: ButtonProps["color"]
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
