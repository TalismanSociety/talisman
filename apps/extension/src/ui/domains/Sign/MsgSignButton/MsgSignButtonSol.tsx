import { base58 } from "@talismn/crypto"
import { classNames } from "@talismn/util"
import { isAccountOwned, isAccountPlatformSolana } from "extension-core"
import { FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { useAccountByAddress } from "@ui/state"

import { SignLedgerSolana, SolSignOutput, SolSignPayload } from "../SignLedgerSolana"
import { MsgSignButtonFallback } from "./MsgSignButtonFallback"
import { MsgSignButtonProps } from "./types"

export const MsgSignButtonSol: FC<MsgSignButtonProps<"solana">> = ({
  payload,
  containerId,
  label,
  className,
  onSubmit,
}) => {
  const { t } = useTranslation()
  const account = useAccountByAddress(payload.address)

  const handleLedgerSignature = useCallback(
    async (output: SolSignOutput) => {
      if (output.type !== "message") throw new Error("Unexpected output from Ledger signing")

      onSubmit(base58.encode(output.signature))
    },
    [onSubmit],
  )

  const signerPayload = useMemo<SolSignPayload>(() => {
    return { type: "message", message: payload.message }
  }, [payload.message])

  if (!isAccountPlatformSolana(account) || !isAccountOwned(account))
    return <MsgSignButtonFallback label={label} className={className} />

  switch (account.type) {
    case "ledger-solana":
      return (
        <SignLedgerSolana
          account={account}
          payload={signerPayload}
          className={className}
          containerId={containerId}
          onSigned={handleLedgerSignature}
        />
      )
    default:
      return (
        <Button onClick={() => onSubmit()} className={classNames("w-full", className)} primary>
          {label ?? t("Sign")}
        </Button>
      )
  }
}
