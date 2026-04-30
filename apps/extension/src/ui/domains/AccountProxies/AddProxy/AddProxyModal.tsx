import { isAccountCompatibleWithNetwork } from "@core/domains/accounts/helpers"
import { Enum } from "@polkadot-api/substrate-bindings"
import type { DotNetwork } from "@talismn/chaindata-provider"
import { encodeAnyAddress } from "@talismn/crypto"
import { api } from "@ui/api"
import { Button } from "@ui/components/Button"
import { Modal } from "@ui/components/Modal"
import { notify } from "@ui/components/Notifications"
import { PillButton } from "@ui/components/PillButton"
import { PopupSizeModalContainer } from "@ui/components/PopupSizeModalContainer"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import { PasswordUnlock } from "@ui/domains/Account/PasswordUnlock"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { SapiSendButton } from "@ui/domains/Transactions/SapiSendButton"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useAccountCanWriteProxies } from "@ui/state/accountProxies"
import { useAccountByAddress } from "@ui/state/accounts"
import { useNetworks } from "@ui/state/chaindata"
import { type FC, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import type { Hex } from "viem"

import { AddressDisplay } from "../../SendFunds/AddressDisplay"
import { NetworkPicker } from "./NetworkPicker"
import { useAddProxyModal } from "./useAddProxyModal"

const PROXY_TYPES = [
  "Any",
  "NonTransfer",
  "Governance",
  "Staking",
  "IdentityJudgement",
  "CancelProxy",
]

export const AddProxyModal: FC = () => {
  const { isOpen, args, close } = useAddProxyModal()
  return (
    <Modal isOpen={isOpen && !!args?.address} onDismiss={close}>
      <PopupSizeModalContainer id="add-proxy-modal">
        {!!args?.address && <AddProxyContent address={args.address} onClose={close} />}
      </PopupSizeModalContainer>
    </Modal>
  )
}

const AddProxyContent: FC<{ address: string; onClose: () => void }> = ({ address, onClose }) => {
  const { t } = useTranslation()
  const account = useAccountByAddress(address)
  const canWrite = useAccountCanWriteProxies(address)
  const dotNetworks = useNetworks({ activeOnly: true, includeTestnets: true, platform: "polkadot" })

  const compatibleNetworks = useMemo<DotNetwork[]>(
    () => (account ? dotNetworks.filter((n) => isAccountCompatibleWithNetwork(n, account)) : []),
    [account, dotNetworks]
  )

  const [networkId, setNetworkId] = useState<string>("")
  useEffect(() => {
    if (!networkId && compatibleNetworks[0]) setNetworkId(compatibleNetworks[0].id)
  }, [compatibleNetworks, networkId])

  const network = compatibleNetworks.find((n) => n.id === networkId)
  const [delegate, setDelegate] = useState("")
  const [proxyType, setProxyType] = useState<string>("Any")
  const [delay, setDelay] = useState("0")
  const [step, setStep] = useState<"form" | "confirm">("form")
  const [showNetworkPicker, setShowNetworkPicker] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const isAddressValid = useMemo(() => {
    if (!delegate) return false
    try {
      encodeAnyAddress(delegate)
      return true
    } catch {
      return false
    }
  }, [delegate])

  const delayNum = useMemo(() => Number.parseInt(delay, 10), [delay])
  const isDelayValid = Number.isInteger(delayNum) && delayNum >= 0

  const canProceed = !!network && isAddressValid && PROXY_TYPES.includes(proxyType) && isDelayValid

  if (!canWrite) {
    return (
      <WizardModalDialog title={t("Add Proxy")} onCloseClick={onClose}>
        <p className="text-body-secondary">
          {t(
            "Adding proxies is not supported on this account type yet. Only local (keypair) accounts can sign proxy management extrinsics."
          )}
        </p>
        <div className="grow" />
        <Button onClick={onClose}>{t("Close")}</Button>
      </WizardModalDialog>
    )
  }

  if (step === "form") {
    return (
      <WizardModalDialog title={t("Add Proxy")} onCloseClick={onClose}>
        <div className="flex flex-col rounded bg-grey-900 px-12 py-8 text-body-secondary leading-[140%]">
          <div className="flex h-16 items-center justify-between gap-8">
            <div className="whitespace-nowrap text-body-secondary">{t("Account")}</div>
            <AddressDisplay className="h-16" address={address} networkId={networkId || undefined} />
          </div>
          <div className="flex h-16 items-center justify-between gap-8">
            <div className="whitespace-nowrap text-body-secondary">{t("Network")}</div>
            <PillButton
              className="h-16 max-w-full px-4!"
              onClick={() => setShowNetworkPicker(true)}
            >
              <div className="flex h-16 max-w-full flex-nowrap items-center gap-4 overflow-x-hidden text-base text-body">
                {network ? (
                  <>
                    <NetworkLogo networkId={network.id} className="shrink-0 text-lg!" />
                    <div className="grow truncate leading-base">{network.name}</div>
                  </>
                ) : (
                  <div className="text-body-disabled">{t("Select network")}</div>
                )}
              </div>
            </PillButton>
          </div>
          <div className="flex h-16 items-center justify-between gap-8">
            <div className="whitespace-nowrap text-body-secondary">{t("Delegate")}</div>
            {isAddressValid ? (
              <AddressDisplay
                className="h-16"
                address={delegate}
                networkId={networkId || undefined}
              />
            ) : (
              <div className="truncate text-base text-body-disabled">
                {delegate ? t("Invalid address") : t("Not set")}
              </div>
            )}
          </div>
        </div>
        <div className="flex grow flex-col gap-8">
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-body-secondary">{t("Delegate address")}</span>
            <input
              type="text"
              spellCheck={false}
              value={delegate}
              onChange={(e) => setDelegate(e.target.value.trim())}
              className="rounded bg-grey-800 p-4 font-mono"
              placeholder="5..."
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-body-secondary">{t("Proxy type")}</span>
            <select
              value={proxyType}
              onChange={(e) => setProxyType(e.target.value)}
              className="rounded bg-grey-800 p-4"
            >
              {PROXY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-body-secondary">{t("Delay (blocks)")}</span>
            <input
              type="number"
              min={0}
              value={delay}
              onChange={(e) => setDelay(e.target.value)}
              className="rounded bg-grey-800 p-4"
            />
            {delayNum > 0 && (
              <span className="text-alert-warn text-xs">
                {t(
                  "Delayed proxies require an announcement workflow which Talisman doesn't support yet."
                )}
              </span>
            )}
          </label>
        </div>
        <Button primary onClick={() => setStep("confirm")} disabled={!canProceed}>
          {t("Continue")}
        </Button>
        <NetworkPicker
          isOpen={showNetworkPicker}
          containerId="add-proxy-modal"
          networks={compatibleNetworks}
          selectedNetworkId={networkId}
          onSelect={(id) => {
            setNetworkId(id)
            setShowNetworkPicker(false)
          }}
          onDismiss={() => setShowNetworkPicker(false)}
        />
      </WizardModalDialog>
    )
  }

  return (
    <AddProxyConfirm
      address={address}
      network={network!}
      delegate={delegate}
      proxyType={proxyType}
      delay={delayNum}
      submitting={submitting}
      setSubmitting={setSubmitting}
      onBack={() => setStep("form")}
      onClose={onClose}
    />
  )
}

const AddProxyConfirm: FC<{
  address: string
  network: DotNetwork
  delegate: string
  proxyType: string
  delay: number
  submitting: boolean
  setSubmitting: (v: boolean) => void
  onBack: () => void
  onClose: () => void
}> = ({
  address,
  network,
  delegate,
  proxyType,
  delay,
  submitting,
  setSubmitting,
  onBack,
  onClose,
}) => {
  const { t } = useTranslation()
  const { data: sapi } = useScaleApi(network.id)
  const [payload, setPayload] = useState<Awaited<
    ReturnType<NonNullable<typeof sapi>["getExtrinsicPayload"]>
  > | null>(null)

  useEffect(() => {
    if (!sapi) return
    let cancelled = false
    sapi
      .getExtrinsicPayload(
        "Proxy",
        "add_proxy",
        {
          delegate: { type: "Id", value: delegate },
          proxy_type: Enum(proxyType),
          delay,
        },
        { address }
      )
      .then((p) => {
        if (!cancelled) setPayload(p)
      })
      .catch((err) => {
        if (cancelled) return
        notify({
          type: "error",
          title: t("Failed to build transaction"),
          subtitle: String(err?.message ?? err),
        })
      })
    return () => {
      cancelled = true
    }
  }, [address, delay, delegate, proxyType, sapi, t])

  const handleSubmitted = (hash: Hex) => {
    setSubmitting(true)
    api.accountProxiesRefresh({ networkId: network.id, address }).catch(() => {})
    notify({ type: "success", title: t("Add proxy submitted"), subtitle: hash })
    onClose()
  }

  return (
    <WizardModalDialog title={t("Confirm Add Proxy")} onCloseClick={onClose}>
      <div className="flex grow flex-col gap-4 text-sm">
        <Field label={t("Network")} value={network.name} />
        <Field label={t("Delegate")} value={delegate} mono />
        <Field label={t("Proxy type")} value={proxyType} />
        <Field label={t("Delay")} value={`${delay} ${t("blocks")}`} />
      </div>
      <p className="my-4 text-body-secondary text-xs">
        {t("Enter your password to authorise this transaction.")}
      </p>
      <div className="flex flex-col gap-4">
        <Button onClick={onBack} disabled={submitting}>
          {t("Back")}
        </Button>
        <PasswordUnlock buttonText={t("Unlock to sign")}>
          <SapiSendButton
            containerId="add-proxy-modal"
            label={t("Sign and submit")}
            payload={payload?.payload}
            txMetadata={payload?.txMetadata}
            onSubmitted={handleSubmitted}
          />
        </PasswordUnlock>
      </div>
    </WizardModalDialog>
  )
}

const Field: FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="flex justify-between gap-4 border-grey-800 border-b pb-2">
    <span className="text-body-secondary">{label}</span>
    <span className={mono ? "truncate font-mono text-xs" : "truncate"}>{value}</span>
  </div>
)
