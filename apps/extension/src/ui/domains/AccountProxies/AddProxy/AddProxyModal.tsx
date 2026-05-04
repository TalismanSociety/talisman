import { isAccountCompatibleWithNetwork } from "@core/domains/accounts/helpers"
import { isAccountOwned } from "@core/domains/keyring/exports"
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
import { useProxyTypesForNetwork } from "@ui/hooks/useProxyTypesForNetwork"
import { useAccountCanWriteProxies } from "@ui/state/accountProxies"
import { useAccountByAddress, useAccounts } from "@ui/state/accounts"
import { useNetworks } from "@ui/state/chaindata"
import { type FC, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import type { Hex } from "viem"

import { AddressPillButton } from "../../SendFunds/SendFundsAmountForm/AddressPillButton"
import { AccountPicker } from "./AccountPicker"
import { DelegatePicker } from "./DelegatePicker"
import { NetworkPicker } from "./NetworkPicker"
import { useAddProxyModal } from "./useAddProxyModal"

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

const AddProxyContent: FC<{ address: string; onClose: () => void }> = ({
  address: initialAddress,
  onClose,
}) => {
  const { t } = useTranslation()
  const [address, setAddress] = useState(initialAddress)
  const account = useAccountByAddress(address)
  const canWrite = useAccountCanWriteProxies(address)
  const allAccounts = useAccounts("all")
  const dotNetworks = useNetworks({ activeOnly: true, includeTestnets: true, platform: "polkadot" })

  const ownedSubstrateAccounts = useMemo(
    () =>
      allAccounts.filter(
        (a) => isAccountOwned(a) && dotNetworks.some((n) => isAccountCompatibleWithNetwork(n, a))
      ),
    [allAccounts, dotNetworks]
  )

  const compatibleNetworks = useMemo<DotNetwork[]>(
    () => (account ? dotNetworks.filter((n) => isAccountCompatibleWithNetwork(n, account)) : []),
    [account, dotNetworks]
  )

  const [networkId, setNetworkId] = useState<string>("")
  useEffect(() => {
    if (!networkId && compatibleNetworks[0]) setNetworkId(compatibleNetworks[0].id)
  }, [compatibleNetworks, networkId])

  const network = compatibleNetworks.find((n) => n.id === networkId)
  const proxyTypes = useProxyTypesForNetwork(networkId || null)
  const [delegate, setDelegate] = useState("")
  const [proxyType, setProxyType] = useState<string>("")
  const [delay, setDelay] = useState("0")
  const [step, setStep] = useState<"form" | "confirm">("form")
  const [showNetworkPicker, setShowNetworkPicker] = useState(false)
  const [showDelegatePicker, setShowDelegatePicker] = useState(false)
  const [showAccountPicker, setShowAccountPicker] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Reset selected proxy type when available types change (e.g. network switch)
  useEffect(() => {
    if (!proxyTypes.length) {
      setProxyType("")
      return
    }
    if (!proxyType || !proxyTypes.some((pt) => pt.name === proxyType)) {
      setProxyType(proxyTypes[0].name)
    }
  }, [proxyType, proxyTypes])

  const selectedProxyTypeDocs = useMemo(
    () => proxyTypes.find((pt) => pt.name === proxyType)?.docs ?? "",
    [proxyType, proxyTypes]
  )

  const handleAccountChange = useCallback((newAddress: string) => {
    setAddress(newAddress)
    setNetworkId("")
    setDelegate("")
  }, [])

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

  const canProceed =
    !!network &&
    isAddressValid &&
    !!proxyType &&
    proxyTypes.some((pt) => pt.name === proxyType) &&
    isDelayValid

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
        <div className="flex flex-col gap-4 rounded bg-grey-900 px-12 py-8 text-body-secondary leading-[140%]">
          <div className="flex h-16 items-center justify-between gap-8">
            <div className="whitespace-nowrap text-body-secondary">{t("Account")}</div>
            <AddressPillButton
              className="max-w-65!"
              address={address}
              genesisHash={network?.genesisHash}
              onClick={() => setShowAccountPicker(true)}
            />
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
              <AddressPillButton
                className="max-w-65!"
                address={delegate}
                genesisHash={network?.genesisHash}
                onClick={() => setShowDelegatePicker(true)}
              />
            ) : (
              <PillButton
                className="h-16 max-w-full px-4!"
                onClick={() => setShowDelegatePicker(true)}
              >
                <div className="flex h-16 max-w-full flex-nowrap items-center gap-4 overflow-x-hidden text-base text-body-disabled">
                  {t("Select delegate")}
                </div>
              </PillButton>
            )}
          </div>
        </div>
        <div className="flex grow flex-col gap-8">
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-body-secondary">{t("Proxy type")}</span>
            <select
              value={proxyType}
              onChange={(e) => setProxyType(e.target.value)}
              disabled={!proxyTypes.length}
              className="rounded bg-grey-800 p-4 disabled:opacity-50"
            >
              {proxyTypes.length === 0 && <option value="">{t("Loading…")}</option>}
              {proxyTypes.map((pt) => (
                <option key={pt.name} value={pt.name}>
                  {pt.name}
                </option>
              ))}
            </select>
            {selectedProxyTypeDocs && (
              <span className="text-body-disabled text-xs leading-snug">
                {selectedProxyTypeDocs}
              </span>
            )}
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
        <DelegatePicker
          isOpen={showDelegatePicker}
          containerId="add-proxy-modal"
          address={address}
          network={network}
          selectedDelegate={delegate}
          onSelect={(selectedAddress) => {
            setDelegate(selectedAddress)
            setShowDelegatePicker(false)
          }}
          onDismiss={() => setShowDelegatePicker(false)}
        />
        <AccountPicker
          isOpen={showAccountPicker}
          containerId="add-proxy-modal"
          accounts={ownedSubstrateAccounts}
          selectedAddress={address}
          onSelect={handleAccountChange}
          onDismiss={() => setShowAccountPicker(false)}
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
