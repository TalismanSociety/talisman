import {
  isAccountCompatibleWithNetwork,
  isAddressCompatibleWithNetwork,
} from "@core/domains/accounts/helpers"
import { isAccountOwned } from "@core/domains/keyring/exports"
import type { DotNetwork } from "@talismn/chaindata-provider"
import { encodeAnyAddress } from "@talismn/crypto"
import { AlertCircleIcon, InfoIcon, PlusIcon } from "@talismn/icons"
import { planckToTokens } from "@talismn/util"
import { Button } from "@ui/components/Button"
import { Modal } from "@ui/components/Modal"
import { PillButton } from "@ui/components/PillButton"
import { PopupSizeModalContainer } from "@ui/components/PopupSizeModalContainer"
import { ScrollContainer } from "@ui/components/ScrollContainer"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { SapiSendButton } from "@ui/domains/Transactions/SapiSendButton"
import { TxProgress } from "@ui/domains/Transactions/TxProgress"
import { useOpenClose } from "@ui/hooks/useOpenClose"
import { useProxyTypesForNetwork } from "@ui/hooks/useProxyTypesForNetwork"
import { useAccountCanWriteProxies } from "@ui/state/accountProxies"
import { useAccountByAddress, useAccounts } from "@ui/state/accounts"
import { useNetworks } from "@ui/state/chaindata"
import { type FC, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import type { Hex } from "viem"
import { AddressPillButton } from "../../SendFunds/SendFundsAmountForm/AddressPillButton"
import { ProxyActionSummary } from "../ProxyActionSummary"
import { ProxyCostBreakdown } from "../ProxyCostBreakdown"
import { useProxyTxPreview } from "../useProxyTxPreview"
import { useRefreshAccountProxiesOnTxSuccess } from "../useRefreshAccountProxiesOnTxSuccess"
import { AccountPicker } from "./AccountPicker"
import { DelegatePicker } from "./DelegatePicker"
import { getDefaultAddProxyNetwork } from "./getDefaultAddProxyNetwork"
import { NetworkPicker } from "./NetworkPicker"
import { ProxyDelayDrawer } from "./ProxyDelayDrawer"
import { ProxyTypePicker } from "./ProxyTypePicker"
import { parseProxyDelay } from "./proxyDelay"
import { useAddProxyModal } from "./useAddProxyModal"

type ActivePicker = "network" | "delegate" | "account" | "proxyType" | null

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

  // Form state
  const [address, setAddress] = useState(initialAddress)
  const [networkId, setNetworkId] = useState("")
  const [delegate, setDelegate] = useState("")
  const [proxyType, setProxyType] = useState("")
  const [delay, setDelay] = useState("0")

  // UI state
  const [step, setStep] = useState<"form" | "confirm" | "submitted">("form")
  const [activePicker, setActivePicker] = useState<ActivePicker>(null)
  const [submittedHash, setSubmittedHash] = useState<string | null>(null)
  const [submittedNetworkId, setSubmittedNetworkId] = useState<string | null>(null)
  const delayDrawer = useOpenClose()

  // Derived data
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

  const network = compatibleNetworks.find((n) => n.id === networkId)
  const { proxyTypes, isFetched: isProxyTypesFetched } = useProxyTypesForNetwork(networkId || null)

  // Auto-select default network
  useEffect(() => {
    const isSelectedNetworkCompatible = compatibleNetworks.some((n) => n.id === networkId)
    if (isSelectedNetworkCompatible) return

    const defaultNetwork = getDefaultAddProxyNetwork(compatibleNetworks)
    if (defaultNetwork) setNetworkId(defaultNetwork.id)
  }, [compatibleNetworks, networkId])

  // Reset proxy type when available types change
  useEffect(() => {
    if (!proxyTypes.length) {
      setProxyType("")
      return
    }
    if (!proxyType || !proxyTypes.some((pt) => pt.name === proxyType)) {
      setProxyType(proxyTypes[0].name)
    }
  }, [proxyType, proxyTypes])

  const handleAccountChange = useCallback((newAddress: string) => {
    setAddress(newAddress)
    setNetworkId("")
    setDelegate("")
  }, [])

  const isDelegateValid = useMemo(() => {
    if (!delegate) return false
    try {
      encodeAnyAddress(delegate)
      return true
    } catch {
      return false
    }
  }, [delegate])

  const delayNum = useMemo(() => parseProxyDelay(delay), [delay])
  const isDelayValid = delayNum !== null

  const isDelegateCompatible = useMemo(
    () => !!(network && delegate && isAddressCompatibleWithNetwork(network, delegate)),
    [network, delegate]
  )

  const canProceed = useMemo(
    () =>
      !!network &&
      isDelegateValid &&
      isDelegateCompatible &&
      !!proxyType &&
      proxyTypes.some((pt) => pt.name === proxyType) &&
      isDelayValid,
    [network, isDelegateValid, isDelegateCompatible, proxyType, proxyTypes, isDelayValid]
  )

  const handleSubmitted = useCallback(
    (hash: Hex) => {
      if (!network) return
      setSubmittedHash(hash)
      setSubmittedNetworkId(network.id)
      setStep("submitted")
    },
    [network]
  )

  useRefreshAccountProxiesOnTxSuccess({
    hash: submittedHash,
    networkId: submittedNetworkId,
    address,
  })

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

  if (step === "submitted" && submittedHash && submittedNetworkId) {
    return (
      <div className="size-full p-12">
        <TxProgress hash={submittedHash} networkIdOrHash={submittedNetworkId} onClose={onClose} />
      </div>
    )
  }

  if (step === "confirm" && network && delayNum !== null) {
    return (
      <AddProxyConfirm
        address={address}
        network={network}
        delegate={delegate}
        proxyType={proxyType}
        delay={delayNum}
        onSubmitted={handleSubmitted}
        onBack={() => setStep("form")}
        onClose={onClose}
      />
    )
  }

  return (
    <WizardModalDialog
      title={t("Add Proxy")}
      onCloseClick={onClose}
      contentClassName="overflow-hidden flex flex-col gap-8"
    >
      <ScrollContainer className="grow">
        <div className="flex flex-col gap-4 rounded bg-grey-900 px-8 py-6 text-body-secondary leading-[140%]">
          <div className="flex h-16 items-center justify-between gap-8">
            <div className="whitespace-nowrap text-body-secondary">{t("Account")}</div>
            <AddressPillButton
              className="max-w-65!"
              address={address}
              genesisHash={network?.genesisHash}
              onClick={() => setActivePicker("account")}
            />
          </div>
          <div className="flex h-16 items-center justify-between gap-8">
            <div className="whitespace-nowrap text-body-secondary">{t("Network")}</div>
            <PillButton
              className="h-16 max-w-full px-4!"
              onClick={() => setActivePicker("network")}
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
            {isDelegateValid ? (
              <AddressPillButton
                className="max-w-65!"
                address={delegate}
                genesisHash={network?.genesisHash}
                onClick={() => setActivePicker("delegate")}
              />
            ) : (
              <PillButton
                className="h-16 max-w-full px-4!"
                onClick={() => setActivePicker("delegate")}
              >
                <div className="flex h-16 max-w-full flex-nowrap items-center gap-4 overflow-x-hidden text-base text-body">
                  <div className="flex size-12 items-center justify-center rounded-full bg-grey-750 text-primary">
                    <PlusIcon className="text-primary" />
                  </div>
                  {t("Select Account")}
                </div>
              </PillButton>
            )}
          </div>
          <div className="flex h-16 items-center justify-between gap-8">
            <div className="whitespace-nowrap text-body-secondary">{t("Proxy type")}</div>
            {proxyTypes.length > 0 ? (
              <PillButton
                className="h-16 max-w-full px-4!"
                onClick={() => setActivePicker("proxyType")}
              >
                <div className="flex h-16 max-w-full flex-nowrap items-center gap-4 overflow-x-hidden text-base text-body">
                  <div className="grow truncate leading-base">{proxyType}</div>
                </div>
              </PillButton>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <PillButton className="h-16 max-w-full px-4!" disabled>
                    <div className="flex h-16 max-w-full flex-nowrap items-center gap-4 overflow-x-hidden text-base">
                      <div className="grow truncate text-body-disabled leading-base">
                        {isProxyTypesFetched ? t("Unavailable") : t("Loading…")}
                      </div>
                    </div>
                  </PillButton>
                </TooltipTrigger>
                {isProxyTypesFetched && (
                  <TooltipContent>{t("Proxies are not supported on this network.")}</TooltipContent>
                )}
              </Tooltip>
            )}
          </div>
          <div className="flex h-16 items-center justify-between gap-8">
            <div className="flex items-center gap-2 whitespace-nowrap text-body-secondary">
              <span>{t("Delay")}</span>
              <Tooltip>
                <TooltipTrigger>
                  <InfoIcon className="text-xs" />
                </TooltipTrigger>
                <TooltipContent>
                  {t(
                    "Delayed proxies require an announcement workflow which Talisman doesn't support at this time."
                  )}
                </TooltipContent>
              </Tooltip>
            </div>
            <PillButton className="h-16 max-w-full px-4!" onClick={delayDrawer.open}>
              <div className="flex h-16 max-w-full flex-nowrap items-center gap-4 overflow-x-hidden text-base text-body">
                <div className="grow truncate leading-base">
                  {delay} {t("blocks")}
                </div>
              </div>
            </PillButton>
          </div>
        </div>
      </ScrollContainer>
      <Button
        primary
        onClick={() => setStep("confirm")}
        disabled={!canProceed}
        className="shrink-0"
      >
        {t("Continue")}
      </Button>
      <NetworkPicker
        isOpen={activePicker === "network"}
        containerId="add-proxy-modal"
        networks={compatibleNetworks}
        selectedNetworkId={networkId}
        onSelect={(id) => {
          setNetworkId(id)
          setActivePicker(null)
        }}
        onDismiss={() => setActivePicker(null)}
      />
      <DelegatePicker
        isOpen={activePicker === "delegate"}
        containerId="add-proxy-modal"
        address={address}
        network={network}
        selectedDelegate={delegate}
        onSelect={(selectedAddress) => {
          setDelegate(selectedAddress)
          setActivePicker(null)
        }}
        onDismiss={() => setActivePicker(null)}
      />
      <AccountPicker
        isOpen={activePicker === "account"}
        containerId="add-proxy-modal"
        accounts={ownedSubstrateAccounts}
        selectedAddress={address}
        onSelect={handleAccountChange}
        onDismiss={() => setActivePicker(null)}
      />
      <ProxyTypePicker
        isOpen={activePicker === "proxyType"}
        containerId="add-proxy-modal"
        proxyTypes={proxyTypes}
        selectedProxyType={proxyType}
        onSelect={(type) => {
          setProxyType(type)
          setActivePicker(null)
        }}
        onDismiss={() => setActivePicker(null)}
      />
      <ProxyDelayDrawer
        isOpen={delayDrawer.isOpen}
        onClose={delayDrawer.close}
        containerId="add-proxy-modal"
        delay={delay}
        onSave={setDelay}
      />
    </WizardModalDialog>
  )
}

const AddProxyConfirm: FC<{
  address: string
  network: DotNetwork
  delegate: string
  proxyType: string
  delay: number
  onSubmitted: (hash: Hex) => void
  onBack: () => void
  onClose: () => void
}> = ({ address, network, delegate, proxyType, delay, onSubmitted, onBack, onClose }) => {
  const { t } = useTranslation()

  const preview = useProxyTxPreview({
    networkId: network.id,
    nativeTokenId: network.nativeTokenId,
    accountAddress: address,
    delegateAddress: delegate,
    proxyType,
    delay,
    method: "add_proxy",
  })

  const {
    nativeToken,
    payload,
    isAffordabilityCheckUnavailable,
    insufficientBalance,
    proxySets,
    isCheckingDuplicates,
  } = preview

  // Detect if this exact proxy already exists on-chain
  const isDuplicate = useMemo(() => {
    const set = proxySets.find((s) => s.networkId === network.id)
    if (!set?.proxies?.length) return false
    const normalizedDelegate = encodeAnyAddress(delegate, { ss58Format: 42 })
    return set.proxies.some(
      (p) =>
        encodeAnyAddress(p.delegate, { ss58Format: 42 }) === normalizedDelegate &&
        p.proxyType === proxyType &&
        p.delay === String(delay)
    )
  }, [proxySets, network.id, delegate, proxyType, delay])

  return (
    <WizardModalDialog
      title={t("Add Proxy")}
      contentClassName="size-full flex flex-col overflow-hidden"
      onBackClick={onBack}
      onCloseClick={onClose}
    >
      <ScrollContainer className="grow" innerClassName="flex w-full flex-col gap-8">
        <h2 className="mb-4 text-center font-bold text-md">{t("Review transaction")}</h2>
        <ProxyActionSummary
          accountAddress={address}
          networkId={network.id}
          networkName={network.name}
          networkPrefix={network.prefix}
          delegateAddress={delegate}
          proxyType={proxyType}
          delay={delay}
        />
        <div className="mt-4">
          <ProxyCostBreakdown preview={preview} depositLabel={t("Reserved deposit")} />
        </div>
        {isDuplicate ? (
          <div className="flex items-start gap-4 rounded bg-alert-warn/10 px-8 py-6 text-alert-warn text-xs">
            <AlertCircleIcon className="mt-0.5 shrink-0 text-sm" />
            <span>
              {t(
                "This proxy already exists on-chain. Submitting a duplicate will fail and still deduct a network fee."
              )}
            </span>
          </div>
        ) : insufficientBalance ? (
          <div className="flex items-start gap-4 rounded bg-alert-warn/10 px-8 py-6 text-alert-warn text-xs">
            <AlertCircleIcon className="mt-0.5 shrink-0 text-sm" />
            <span>
              {t(
                "Insufficient balance to cover the proxy deposit, network fee, and keep the account alive."
              )}
            </span>
          </div>
        ) : (
          preview.depositDelta !== null &&
          nativeToken && (
            <div className="flex items-start gap-4 rounded bg-primary/10 px-8 py-6 text-primary text-xs">
              <AlertCircleIcon className="mt-0.5 shrink-0 text-sm" />
              <span>
                {t(
                  "{{amount}} will be reserved from your balance and returned when this proxy is removed.",
                  {
                    amount: `${planckToTokens(preview.depositDelta.toString(), nativeToken.decimals)} ${nativeToken.symbol}`,
                  }
                )}
              </span>
            </div>
          )
        )}
      </ScrollContainer>
      <SapiSendButton
        containerId="add-proxy-modal"
        label={t("Confirm")}
        payload={payload?.payload}
        txMetadata={payload?.txMetadata}
        onSubmitted={onSubmitted}
        disabled={
          isAffordabilityCheckUnavailable ||
          insufficientBalance ||
          isDuplicate ||
          isCheckingDuplicates
        }
        className="shrink-0"
        checkPassword
      />
    </WizardModalDialog>
  )
}
