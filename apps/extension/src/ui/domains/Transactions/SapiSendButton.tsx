import type { AccountPolkadotVault, SignerPayloadJSON, WalletTransactionInfo } from "@core"
import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { AlertCircleIcon, LoaderIcon } from "@talismn/icons"
import type { ScaleApiSubmitMode } from "@talismn/sapi"
import { toHex } from "@talismn/scale"
import { classNames } from "@talismn/util"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useAccountByAddress } from "@ui/state"
import { log } from "extension-shared"
import { type FC, Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button, type ButtonProps } from "talisman-ui"
import type { Hex } from "viem"
import { QrSubstrate } from "../Sign/Qr/QrSubstrate"
import { SignHardwareSubstrate } from "../Sign/SignHardwareSubstrate"

type LockedInputs = {
  payload: SignerPayloadJSON | undefined
  shortMetadata?: `0x${string}` | undefined
  txInfo?: WalletTransactionInfo | undefined
  txMode?: ScaleApiSubmitMode | undefined
}

const useLockedInputs = ({ payload, shortMetadata, txInfo, txMode }: LockedInputs) => {
  const memoizedInputs = useMemo(
    () => ({
      payload,
      shortMetadata,
      txInfo,
      txMode,
    }),
    [payload, shortMetadata, txInfo, txMode]
  )

  const [isLocked, setIsLocked] = useState(false)
  const [lockedInputs, setLockedInputs] = useState<LockedInputs>(() => memoizedInputs)

  useEffect(() => {
    if (!isLocked) setLockedInputs(memoizedInputs)
  }, [isLocked, memoizedInputs])

  return { setIsLocked, lockedInputs }
}

type SapiSendButtonProps = {
  containerId?: string
  label?: string
  payload?: SignerPayloadJSON
  txMetadata?: Uint8Array | `0x${string}`
  txInfo?: WalletTransactionInfo
  loading?: boolean
  disabled?: boolean
  className?: string
  color?: ButtonProps["color"]
  onSubmitted: (hash: Hex, innerHash?: Hex) => void
  mode?: ScaleApiSubmitMode
}

const HardwareAccountSendButton: FC<SapiSendButtonProps> = ({
  containerId,
  payload,
  txMetadata,
  txInfo,
  className,
  onSubmitted,
  mode,
  color,
}) => {
  const [error, setError] = useState<string>()
  const shortMetadata = useMemo(() => getHexShortMetadata(txMetadata), [txMetadata])

  const { lockedInputs, setIsLocked } = useLockedInputs({
    payload,
    shortMetadata,
    txInfo,
    txMode: mode,
  })

  const { data: sapi } = useScaleApi(lockedInputs.payload?.genesisHash)

  const registry = useMemo(() => {
    if (!sapi) return undefined
    if (!lockedInputs.payload) return undefined
    return sapi.getTypeRegistry(lockedInputs.payload)
  }, [lockedInputs.payload, sapi])

  const handleSigned = useCallback(
    async ({ signature }: { signature: Hex }) => {
      const { payload, txInfo, txMode } = lockedInputs
      if (!payload || !signature || !sapi) return

      setError(undefined)
      try {
        const { hash, innerHash } = await sapi.submit(payload, signature, txInfo, txMode)
        onSubmitted(hash, innerHash)
      } catch (err) {
        log.error("Failed to submit", { payload, err })
        // biome-ignore lint/suspicious/noExplicitAny: legacy
        setError((err as any)?.message ?? "Failed to submit")
      }
    },
    [onSubmitted, sapi, lockedInputs]
  )

  return (
    <div className="flex w-full shrink-0 flex-col gap-6 overflow-hidden">
      <SubmitErrorDisplay error={error} />
      <SignHardwareSubstrate
        className={className}
        containerId={containerId}
        onSigned={handleSigned}
        onSentToDevice={setIsLocked}
        color={color}
        registry={registry}
        {...lockedInputs}
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
  color,
}) => {
  const [error, setError] = useState<string>()
  const shortMetadata = useMemo(() => getHexShortMetadata(txMetadata), [txMetadata])

  const { lockedInputs, setIsLocked } = useLockedInputs({
    payload,
    shortMetadata,
    txInfo,
    txMode: mode,
  })

  const account = useAccountByAddress(lockedInputs.payload?.address)
  const { data: sapi } = useScaleApi(lockedInputs.payload?.genesisHash)

  const handleSigned = useCallback(
    async ({ signature }: { signature: Hex }) => {
      const { payload, txMode, txInfo } = lockedInputs
      if (!payload || !signature || !sapi) return

      setError(undefined)
      try {
        const { hash, innerHash } = await sapi.submit(payload, signature, txInfo, txMode)
        onSubmitted(hash, innerHash)
      } catch (err) {
        log.error("Failed to submit", { payload, err })
        // biome-ignore lint/suspicious/noExplicitAny: legacy
        setError((err as any)?.message ?? "Failed to submit")
      }
    },
    [lockedInputs, onSubmitted, sapi]
  )

  if (!account) return null

  return (
    <div className="flex w-full flex-col gap-6">
      <SubmitErrorDisplay error={error} />
      <QrSubstrate
        containerId={containerId ?? "main"}
        buttonClassName={className}
        genesisHash={lockedInputs.payload?.genesisHash}
        account={account as AccountPolkadotVault}
        onSignature={handleSigned}
        color={color}
        onQrDisplayed={setIsLocked}
        {...lockedInputs}
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
  color,
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
      // biome-ignore lint/suspicious/noExplicitAny: legacy
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
        color={color}
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

  // TODO if payload becomes undefined (while sapi.getPayload is loading), the component unmounts which causes UX issues.
  // make it so we dont need a fallback disabled button here
  if (!props.payload)
    return (
      <Button
        className={classNames("w-full", props.className)}
        primary
        disabled
        color={props.color}
      >
        {props.label ?? <LoaderIcon className="animate-spin-slow text-lg" />}
      </Button>
    )

  return (
    <Suspense fallback={<SuspenseTracker name="SapiSendButton" />}>
      {signMethod === "local" && <LocalAccountSendButton {...props} />}
      {signMethod === "hardware" && <HardwareAccountSendButton {...props} />}
      {signMethod === "qr" && <QrAccountSendButton {...props} />}
      {signMethod === "loading" && (
        <Button
          className={classNames("w-full", props.className)}
          primary
          disabled
          color={props.color}
        >
          <LoaderIcon className="animate-spin-slow text-lg" />
        </Button>
      )}
      {signMethod === "unsupported" && (
        <Button
          className={classNames("w-full", props.className)}
          primary
          disabled
          color={props.color}
        >
          {t("Unsupported account type: {{type}}", { type: account?.type })}
        </Button>
      )}
    </Suspense>
  )
}

const SubmitErrorDisplay: FC<{ error: string | null | undefined }> = ({ error }) =>
  error ? (
    <div className="flex w-full items-center gap-5 rounded-sm bg-grey-900 px-5 py-6 pr-0 text-alert-warn text-xs">
      <AlertCircleIcon className="shrink-0 text-lg" />
      <div className="scrollable scrollable-800 max-h-40 overflow-y-auto pr-5">{error}</div>
    </div>
  ) : null

const getHexShortMetadata = (
  txMetadata?: Uint8Array | `0x${string}`
): `0x${string}` | undefined => {
  if (typeof txMetadata === "string") return txMetadata as `0x${string}`
  return txMetadata ? (toHex(txMetadata) as `0x${string}`) : undefined
}
