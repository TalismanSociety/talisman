import { log } from "@common/log"
import type { AccountPolkadotVault } from "@core/domains/keyring/exports"
import type { SignerPayloadJSON } from "@core/domains/signing/types"
import type { WalletTransactionInfo } from "@core/domains/transactions/types"
import { LoaderIcon } from "@talismn/icons"
import type { ScaleApiSubmitMode } from "@talismn/sapi"
import { toHex } from "@talismn/scale"
import { useQuery } from "@tanstack/react-query"
import { Button, type ButtonProps } from "@ui/components/Button"
import { notify } from "@ui/components/Notifications"
import { SuspenseTracker } from "@ui/components/SuspenseTracker"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useAccountByAddress } from "@ui/state/accounts"
import { useNetworkByGenesisHash } from "@ui/state/chaindata"
import { cn } from "@ui/util/cn"
import { getFrontendTypeRegistry } from "@ui/util/getFrontendTypeRegistry"
import { type FC, Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
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
  const { t } = useTranslation()
  const shortMetadata = useMemo(() => getHexShortMetadata(txMetadata), [txMetadata])

  const { lockedInputs, setIsLocked } = useLockedInputs({
    payload,
    shortMetadata,
    txInfo,
    txMode: mode,
  })

  const { data: sapi } = useScaleApi(lockedInputs.payload?.genesisHash)

  const network = useNetworkByGenesisHash(lockedInputs.payload?.genesisHash)
  const { data: registry } = useQuery({
    queryKey: [
      "SapiSendButton-registry",
      lockedInputs.payload?.genesisHash,
      lockedInputs.payload?.specVersion,
    ],
    queryFn: async () => {
      if (!lockedInputs.payload) return null
      const { registry } = await getFrontendTypeRegistry(
        network ?? undefined,
        lockedInputs.payload.specVersion,
        lockedInputs.payload.signedExtensions
      )
      return registry
    },
    enabled: !!lockedInputs.payload,
  })

  const handleSigned = useCallback(
    async ({ signature }: { signature: Hex }) => {
      const { payload, txInfo, txMode } = lockedInputs
      if (!payload || !signature || !sapi) return

      try {
        const { hash, innerHash } = await sapi.submit(payload, signature, txInfo, txMode)
        onSubmitted(hash, innerHash)
      } catch (err) {
        log.error("Failed to submit", { payload, err })
        notify({
          type: "error",
          title: t("Failed to submit"),
          // biome-ignore lint/suspicious/noExplicitAny: legacy
          subtitle: (err as any)?.message?.slice(0, 200) ?? t("Unknown error"),
        })
      }
    },
    [onSubmitted, sapi, lockedInputs, t]
  )

  return (
    <SignHardwareSubstrate
      className={className}
      containerId={containerId}
      onSigned={handleSigned}
      onSentToDevice={setIsLocked}
      color={color}
      registry={registry ?? undefined}
      {...lockedInputs}
    />
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
  const { t } = useTranslation()
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

      try {
        const { hash, innerHash } = await sapi.submit(payload, signature, txInfo, txMode)
        onSubmitted(hash, innerHash)
      } catch (err) {
        log.error("Failed to submit", { payload, err })
        notify({
          type: "error",
          title: t("Failed to submit"),
          // biome-ignore lint/suspicious/noExplicitAny: legacy
          subtitle: (err as any)?.message?.slice(0, 200) ?? t("Unknown error"),
        })
      }
    },
    [lockedInputs, onSubmitted, sapi, t]
  )

  if (!account) return null

  return (
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

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmitClick = useCallback(async () => {
    if (!sapi) return
    if (!payload) return
    setIsSubmitting(true)
    try {
      const { hash } = await sapi.submit(payload, undefined, txInfo, mode)
      setIsSubmitting(false)
      onSubmitted(hash)
    } catch (err) {
      setIsSubmitting(false)
      log.error("Failed to submit", { payload, err })
      notify({
        type: "error",
        title: t("Failed to submit"),
        // biome-ignore lint/suspicious/noExplicitAny: legacy
        subtitle: (err as any)?.message?.slice(0, 200) ?? t("Unknown error"),
      })
    }
  }, [mode, onSubmitted, payload, sapi, t, txInfo])

  return (
    <Button
      className={cn("w-full", className)}
      primary
      disabled={disabled}
      onClick={handleSubmitClick}
      processing={isSubmitting}
      color={color}
    >
      {label ?? t("Confirm")}
    </Button>
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
      <Button className={cn("w-full", props.className)} primary disabled color={props.color}>
        {props.label ?? <LoaderIcon className="animate-spin-slow text-lg" />}
      </Button>
    )

  return (
    <Suspense fallback={<SuspenseTracker name="SapiSendButton" />}>
      {signMethod === "local" && <LocalAccountSendButton {...props} />}
      {signMethod === "hardware" && <HardwareAccountSendButton {...props} />}
      {signMethod === "qr" && <QrAccountSendButton {...props} />}
      {signMethod === "loading" && (
        <Button className={cn("w-full", props.className)} primary disabled color={props.color}>
          <LoaderIcon className="animate-spin-slow text-lg" />
        </Button>
      )}
      {signMethod === "unsupported" && (
        <Button className={cn("w-full", props.className)} primary disabled color={props.color}>
          {t("Unsupported account type: {{type}}", { type: account?.type })}
        </Button>
      )}
    </Suspense>
  )
}

const getHexShortMetadata = (
  txMetadata?: Uint8Array | `0x${string}`
): `0x${string}` | undefined => {
  if (typeof txMetadata === "string") return txMetadata as `0x${string}`
  return txMetadata ? (toHex(txMetadata) as `0x${string}`) : undefined
}
