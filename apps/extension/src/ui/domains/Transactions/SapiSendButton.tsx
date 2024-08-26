import { AlertCircleIcon } from "@talismn/icons"
import { AccountType, SignerPayloadJSON } from "extension-core"
import { log } from "extension-shared"
import { FC, Suspense, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"
import { Hex } from "viem"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"

type SapiSendButtonProps = {
  label?: string
  payload: SignerPayloadJSON
  txMetadata?: Uint8Array
  disabled?: boolean // true while estimating fee
  onSubmitted: (hash: Hex) => void
}

const HardwareAccountSendButton: FC<SapiSendButtonProps> = () => {
  // TODO
  return null
}

const QrAccountSendButton: FC<SapiSendButtonProps> = () => {
  // TODO
  return null
}

const LocalAccountSendButton: FC<SapiSendButtonProps> = ({
  label,
  payload,
  disabled,
  onSubmitted,
}) => {
  const { t } = useTranslation()
  const { data: sapi } = useScaleApi(payload?.genesisHash)

  const [{ isSubmitting, error }, setState] = useState<{
    isSubmitting: boolean
    error: string | null
  }>({ isSubmitting: false, error: null })

  const handleSubmitClick = useCallback(async () => {
    if (!sapi) return
    setState({ isSubmitting: true, error: null })
    try {
      const { hash } = await sapi.submit(payload)
      setState({ isSubmitting: false, error: null })
      onSubmitted(hash)
    } catch (err) {
      log.error("Failed to submit", { payload, err })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setState({ isSubmitting: false, error: (err as any)?.message ?? "Failed to submit" })
    }
  }, [onSubmitted, payload, sapi])

  return (
    <div className="flex w-full flex-col gap-6">
      {error && (
        <div className="text-alert-warn bg-grey-900 flex w-full items-center gap-5 rounded-sm px-5 py-6 text-xs">
          <AlertCircleIcon className="text-lg" />
          <div>{error}</div>
        </div>
      )}
      <Button
        className="w-full"
        primary
        disabled={disabled}
        onClick={handleSubmitClick}
        processing={isSubmitting}
      >
        {label ?? t("Confirm")}
      </Button>
    </div>
  )
}

export const SapiSendButton: FC<SapiSendButtonProps> = (props) => {
  //const { t } = useTranslation()
  // const chain = useChainByGenesisHash(payload?.genesisHash)
  const account = useAccountByAddress(props.payload?.address)

  const signMethod = useMemo(() => {
    switch (account?.origin) {
      case AccountType.Qr:
        return "qr"
      case AccountType.Ledger:
        return "hardware"
      case AccountType.Talisman:
        return "local"
      default:
        throw new Error("Unsupported account type")
    }
  }, [account])

  if (!account) return null

  return (
    <Suspense fallback={null}>
      {/* <div className="flex w-full flex-col gap-6"> */}
      {/* {sendErrorMessage ? (
          <div className="text-alert-warn bg-grey-900 flex w-full items-center gap-5 rounded-sm px-5 py-6 text-xs">
            <AlertCircleIcon className="text-lg" />
            <div>{sendErrorMessage}</div>
          </div>
        ) : (
          <ExternalRecipientWarning />
        )} */}
      {signMethod === "local" && <LocalAccountSendButton {...props} />}
      {signMethod === "hardware" && <HardwareAccountSendButton {...props} />}
      {signMethod === "qr" && <QrAccountSendButton {...props} />}
    </Suspense>
  )
}
