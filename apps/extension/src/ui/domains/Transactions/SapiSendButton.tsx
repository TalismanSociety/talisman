import { AlertCircleIcon } from "@talismn/icons"
import { toHex } from "@talismn/scale"
import { AccountJsonQr, AccountType, SignerPayloadJSON } from "extension-core"
import { log } from "extension-shared"
import { FC, Suspense, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"
import { Hex } from "viem"

import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useAccountByAddress } from "@ui/state"

import { QrSubstrate } from "../Sign/Qr/QrSubstrate"
import { SignHardwareSubstrate } from "../Sign/SignHardwareSubstrate"

type SapiSendButtonProps = {
  containerId?: string
  label?: string
  payload: SignerPayloadJSON
  txMetadata?: Uint8Array
  disabled?: boolean
  onSubmitted: (hash: Hex) => void
}

const HardwareAccountSendButton: FC<SapiSendButtonProps> = ({
  containerId,
  payload,
  txMetadata,
  onSubmitted,
}) => {
  const [error, setError] = useState<string>()
  const { data: sapi } = useScaleApi(payload?.genesisHash)
  const shortMetadata = useMemo(() => (txMetadata ? toHex(txMetadata) : undefined), [txMetadata])

  const registry = useMemo(() => {
    if (!sapi) return undefined
    return sapi.getTypeRegistry(payload)
  }, [payload, sapi])

  const handleSigned = useCallback(
    async ({ signature }: { signature: Hex }) => {
      if (!payload || !signature || !sapi) return

      setError(undefined)
      try {
        const { hash } = await sapi.submit(payload, signature)
        onSubmitted(hash)
      } catch (err) {
        log.error("Failed to submit", { payload, err })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setError((err as any)?.message ?? "Failed to submit")
      }
    },
    [onSubmitted, payload, sapi],
  )

  return (
    <div className="flex w-full flex-col gap-6">
      <SubmitErrorDisplay error={error} />
      <SignHardwareSubstrate
        containerId={containerId}
        payload={payload}
        shortMetadata={shortMetadata}
        registry={registry}
        onSigned={handleSigned}
      />
    </div>
  )
}

const QrAccountSendButton: FC<SapiSendButtonProps> = ({ containerId, payload, onSubmitted }) => {
  const account = useAccountByAddress(payload?.address)
  const [error, setError] = useState<string>()
  const { data: sapi } = useScaleApi(payload?.genesisHash)

  const handleSigned = useCallback(
    async ({ signature }: { signature: Hex }) => {
      if (!payload || !signature || !sapi) return

      setError(undefined)
      try {
        const { hash } = await sapi.submit(payload, signature)
        onSubmitted(hash)
      } catch (err) {
        log.error("Failed to submit", { payload, err })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setError((err as any)?.message ?? "Failed to submit")
      }
    },
    [onSubmitted, payload, sapi],
  )

  if (!account) return null

  return (
    <div className="flex w-full flex-col gap-6">
      <SubmitErrorDisplay error={error} />
      <QrSubstrate
        containerId={containerId ?? "main"}
        genesisHash={payload.genesisHash}
        payload={payload}
        account={account as AccountJsonQr}
        onSignature={handleSigned}
      />
    </div>
  )
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
      <SubmitErrorDisplay error={error} />
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
    <Suspense fallback={<SuspenseTracker name="SapiSendButton" />}>
      {signMethod === "local" && <LocalAccountSendButton {...props} />}
      {signMethod === "hardware" && <HardwareAccountSendButton {...props} />}
      {signMethod === "qr" && <QrAccountSendButton {...props} />}
    </Suspense>
  )
}

const SubmitErrorDisplay: FC<{ error: string | null | undefined }> = ({ error }) =>
  error ? (
    <div className="text-alert-warn bg-grey-900 flex w-full items-center gap-5 rounded-sm px-5 py-6 pr-0 text-xs">
      <AlertCircleIcon className="shrink-0 text-lg" />
      <div className="scrollable scrollable-800 max-h-40 overflow-y-auto pr-5">{error}</div>
    </div>
  ) : null
