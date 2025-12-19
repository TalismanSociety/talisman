import { AlertCircleIcon, LoaderIcon } from "@talismn/icons"
import { toHex } from "@talismn/scale"
import { classNames } from "@talismn/util"
import { AccountPolkadotVault, SignerPayloadJSON, WalletTransactionInfo } from "extension-core"
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
  payload?: SignerPayloadJSON
  txMetadata?: Uint8Array | `0x${string}`
  txInfo?: WalletTransactionInfo
  loading?: boolean
  disabled?: boolean
  className?: string
  onSubmitted: (hash: Hex) => void
  mode?: "default" | "bittensor-mev-shield"
}

const HardwareAccountSendButton: FC<SapiSendButtonProps> = ({
  containerId,
  payload,
  txMetadata,
  txInfo,
  className,
  onSubmitted,
  mode,
}) => {
  const [error, setError] = useState<string>()
  const { data: sapi } = useScaleApi(payload?.genesisHash)
  const shortMetadata = useMemo(() => getHexShortMetadata(txMetadata), [txMetadata])

  const registry = useMemo(() => {
    if (!sapi) return undefined
    if (!payload) return undefined
    return sapi.getTypeRegistry(payload)
  }, [payload, sapi])

  const handleSigned = useCallback(
    async ({ signature }: { signature: Hex }) => {
      if (!payload || !signature || !sapi) return

      setError(undefined)
      try {
        const { hash } = await sapi.submit(payload, signature, txInfo, mode)
        onSubmitted(hash)
      } catch (err) {
        log.error("Failed to submit", { payload, err })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setError((err as any)?.message ?? "Failed to submit")
      }
    },
    [mode, onSubmitted, payload, sapi, txInfo],
  )

  return (
    <div className="flex w-full flex-col gap-6">
      <SubmitErrorDisplay error={error} />
      <SignHardwareSubstrate
        className={className}
        containerId={containerId}
        payload={payload}
        shortMetadata={shortMetadata}
        registry={registry}
        onSigned={handleSigned}
      />
    </div>
  )
}

const QrAccountSendButton: FC<SapiSendButtonProps> = ({
  containerId,
  payload,
  txInfo,
  txMetadata,
  className,
  onSubmitted,
  mode,
}) => {
  const account = useAccountByAddress(payload?.address)
  const [error, setError] = useState<string>()
  const { data: sapi } = useScaleApi(payload?.genesisHash)
  const shortMetadata = useMemo(() => getHexShortMetadata(txMetadata), [txMetadata])

  const handleSigned = useCallback(
    async ({ signature }: { signature: Hex }) => {
      if (!payload || !signature || !sapi) return

      setError(undefined)
      try {
        const { hash } = await sapi.submit(payload, signature, txInfo, mode)
        onSubmitted(hash)
      } catch (err) {
        log.error("Failed to submit", { payload, err })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setError((err as any)?.message ?? "Failed to submit")
      }
    },
    [mode, onSubmitted, payload, sapi, txInfo],
  )

  if (!account) return null

  return (
    <div className="flex w-full flex-col gap-6">
      <SubmitErrorDisplay error={error} />
      <QrSubstrate
        containerId={containerId ?? "main"}
        className={className}
        genesisHash={payload?.genesisHash}
        payload={payload}
        shortMetadata={shortMetadata}
        account={account as AccountPolkadotVault}
        onSignature={handleSigned}
      />
    </div>
  )
}

const LocalAccountSendButton: FC<SapiSendButtonProps> = ({
  label,
  payload,
  disabled,
  txInfo,
  className,
  onSubmitted,
  mode,
}) => {
  const { t } = useTranslation()
  const { data: sapi } = useScaleApi(payload?.genesisHash)

  const [{ isSubmitting, error }, setState] = useState<{
    isSubmitting: boolean
    error: string | null
  }>({ isSubmitting: false, error: null })

  const handleSubmitClick = useCallback(async () => {
    if (!sapi) return
    if (!payload) return
    setState({ isSubmitting: true, error: null })
    try {
      const { hash } = await sapi.submit(payload, undefined, txInfo, mode)
      setState({ isSubmitting: false, error: null })
      onSubmitted(hash)
    } catch (err) {
      log.error("Failed to submit", { payload, err })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setState({ isSubmitting: false, error: (err as any)?.message ?? "Failed to submit" })
    }
  }, [mode, onSubmitted, payload, sapi, txInfo])

  return (
    <div className="flex w-full flex-col gap-6">
      <SubmitErrorDisplay error={error} />
      <Button
        className={classNames("w-full", className)}
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
  const { t } = useTranslation()
  const account = useAccountByAddress(props.payload?.address)

  const signMethod = useMemo(() => {
    switch (account?.type) {
      case "polkadot-vault":
        return "qr"
      case "ledger-polkadot":
        return "hardware"
      case "keypair":
        return "local"
      default:
        if (props.loading) return "loading"
        return "unsupported"
    }
  }, [account, props.loading])

  return (
    <Suspense fallback={<SuspenseTracker name="SapiSendButton" />}>
      {signMethod === "local" && <LocalAccountSendButton {...props} />}
      {signMethod === "hardware" && <HardwareAccountSendButton {...props} />}
      {signMethod === "qr" && <QrAccountSendButton {...props} />}
      {signMethod === "loading" && (
        <Button className={classNames("w-full", props.className)} primary disabled>
          <LoaderIcon className="animate-spin-slow text-lg" />
        </Button>
      )}
      {signMethod === "unsupported" && (
        <Button className={classNames("w-full", props.className)} primary disabled>
          {t("Unsupported account type: {{type}}", { type: account?.type })}
        </Button>
      )}
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

const getHexShortMetadata = (
  txMetadata?: Uint8Array | `0x${string}`,
): `0x${string}` | undefined => {
  if (typeof txMetadata === "string") return txMetadata as `0x${string}`
  return txMetadata ? (toHex(txMetadata) as `0x${string}`) : undefined
}
