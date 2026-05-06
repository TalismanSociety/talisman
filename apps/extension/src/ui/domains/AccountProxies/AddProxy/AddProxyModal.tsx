import { isAccountCompatibleWithNetwork } from "@core/domains/accounts/helpers"
import { isAccountOwned } from "@core/domains/keyring/exports"
import type { DotNetwork } from "@talismn/chaindata-provider"
import { encodeAnyAddress } from "@talismn/crypto"
import { AlertCircleIcon, InfoIcon, PlusIcon } from "@talismn/icons"
import { Button } from "@ui/components/Button"
import { Modal } from "@ui/components/Modal"
import { notify } from "@ui/components/Notifications"
import { PillButton } from "@ui/components/PillButton"
import { PopupSizeModalContainer } from "@ui/components/PopupSizeModalContainer"
import { ScrollContainer } from "@ui/components/ScrollContainer"
import { Skeleton } from "@ui/components/Skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { AccountDisplay } from "@ui/domains/Earn/shared/AccountDisplay"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { StakingFeeEstimate } from "@ui/domains/Staking/shared/StakingFeeEstimate"
import { SapiSendButton } from "@ui/domains/Transactions/SapiSendButton"
import { TxProgress } from "@ui/domains/Transactions/TxProgress"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useBalancesByParams } from "@ui/hooks/useBalancesByParams"
import { useExistentialDeposit } from "@ui/hooks/useExistentialDeposit"
import { useOpenClose } from "@ui/hooks/useOpenClose"
import { useProxyTypesForNetwork } from "@ui/hooks/useProxyTypesForNetwork"
import { useAccountCanWriteProxies, useAccountProxySetsForAddress } from "@ui/state/accountProxies"
import { useAccountByAddress, useAccounts } from "@ui/state/accounts"
import { useNetworks, useToken } from "@ui/state/chaindata"
import { type FC, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import type { Hex } from "viem"
import { AddressPillButton } from "../../SendFunds/SendFundsAmountForm/AddressPillButton"
import { useGetFeeEstimate } from "../../Staking/shared/useGetFeeEstimate"
import { buildProxyPayload } from "../buildProxyPayload"
import { getProxyCountForNetwork, getProxyDeposit } from "../proxyDeposit"
import { useRefreshAccountProxiesOnTxSuccess } from "../useRefreshAccountProxiesOnTxSuccess"
import { AccountPicker } from "./AccountPicker"
import { DelegatePicker } from "./DelegatePicker"
import { NetworkPicker } from "./NetworkPicker"
import { ProxyDelayDrawer } from "./ProxyDelayDrawer"
import { ProxyTypePicker } from "./ProxyTypePicker"
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
  const { proxyTypes, isFetched: isProxyTypesFetched } = useProxyTypesForNetwork(networkId || null)
  const [delegate, setDelegate] = useState("")
  const [proxyType, setProxyType] = useState<string>("")
  const [delay, setDelay] = useState("0")
  const [step, setStep] = useState<"form" | "confirm" | "submitted">("form")
  const [submittedHash, setSubmittedHash] = useState<string | null>(null)
  const [submittedNetworkId, setSubmittedNetworkId] = useState<string | null>(null)
  const [showNetworkPicker, setShowNetworkPicker] = useState(false)
  const [showDelegatePicker, setShowDelegatePicker] = useState(false)
  const [showAccountPicker, setShowAccountPicker] = useState(false)
  const [showProxyTypePicker, setShowProxyTypePicker] = useState(false)
  const delayDrawer = useOpenClose()

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

  if (step === "form") {
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
                  onClick={() => setShowProxyTypePicker(true)}
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
                    <TooltipContent>
                      {t("Proxies are not supported on this network.")}
                    </TooltipContent>
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
        <ProxyTypePicker
          isOpen={showProxyTypePicker}
          containerId="add-proxy-modal"
          proxyTypes={proxyTypes}
          selectedProxyType={proxyType}
          onSelect={(type) => {
            setProxyType(type)
            setShowProxyTypePicker(false)
          }}
          onDismiss={() => setShowProxyTypePicker(false)}
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

  if (step === "submitted" && submittedHash && submittedNetworkId) {
    return (
      <div className="size-full p-12">
        <TxProgress hash={submittedHash} networkIdOrHash={submittedNetworkId} onClose={onClose} />
      </div>
    )
  }

  return (
    <AddProxyConfirm
      address={address}
      network={network!}
      delegate={delegate}
      proxyType={proxyType}
      delay={delayNum}
      onSubmitted={handleSubmitted}
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
  onSubmitted: (hash: Hex) => void
  onBack: () => void
  onClose: () => void
}> = ({ address, network, delegate, proxyType, delay, onSubmitted, onBack, onClose }) => {
  const { t } = useTranslation()
  const { data: sapi } = useScaleApi(network.id)
  const nativeToken = useToken(network.nativeTokenId)
  const [payload, setPayload] = useState<Awaited<
    ReturnType<NonNullable<typeof sapi>["getExtrinsicPayload"]>
  > | null>(null)

  // Existing proxy count for this network to compute accurate deposit
  const proxySets = useAccountProxySetsForAddress(address)
  const existingProxyCount = useMemo(
    () => getProxyCountForNetwork(proxySets, network.id),
    [proxySets, network.id]
  )

  // Additional deposit reserved by adding this proxy.
  const additionalReservedDeposit = useMemo(() => {
    if (!sapi) return null
    try {
      const base = sapi.getConstant<bigint>("Proxy", "ProxyDepositBase")
      const factor = sapi.getConstant<bigint>("Proxy", "ProxyDepositFactor")
      const currentDeposit = getProxyDeposit(existingProxyCount, base, factor)
      const nextDeposit = getProxyDeposit(existingProxyCount + 1, base, factor)
      return nextDeposit - currentDeposit
    } catch {
      return null
    }
  }, [sapi, existingProxyCount])

  // Fee estimate
  const {
    data: feeEstimate,
    isLoading: isLoadingFee,
    error: feeError,
  } = useGetFeeEstimate({ sapi: sapi ?? null, payload: payload?.payload })

  // Balance check: account must afford deposit + fee while staying alive (>= ED)
  const addressesAndTokens = useMemo(
    () => ({
      addresses: [address],
      tokenIds: nativeToken?.id ? [nativeToken.id] : [],
    }),
    [address, nativeToken?.id]
  )
  const { status: balanceStatus, balances } = useBalancesByParams({ addressesAndTokens })
  const balance = useMemo(
    () =>
      nativeToken?.id
        ? (balances.find({ address, tokenId: nativeToken.id }).each[0] ?? null)
        : null,
    [balances, address, nativeToken?.id]
  )
  const isBalanceLoading = balanceStatus === "initialising"
  // When subscription is live but no entry exists, account has 0 balance
  const transferablePlanck = isBalanceLoading ? null : (balance?.transferable.planck ?? 0n)

  const existentialDeposit = useExistentialDeposit(nativeToken?.id)

  const insufficientBalance = useMemo(() => {
    if (
      transferablePlanck === null ||
      additionalReservedDeposit === null ||
      !feeEstimate ||
      !existentialDeposit
    )
      return false
    const required = additionalReservedDeposit + feeEstimate + existentialDeposit.planck
    return transferablePlanck < required
  }, [transferablePlanck, additionalReservedDeposit, feeEstimate, existentialDeposit])

  useEffect(() => {
    if (!sapi) return
    let cancelled = false
    buildProxyPayload(sapi, "add_proxy", delegate, proxyType, delay, address)
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
    onSubmitted(hash)
  }

  return (
    <WizardModalDialog
      title={t("Add Proxy")}
      contentClassName="size-full flex flex-col overflow-hidden"
      onBackClick={onBack}
      onCloseClick={onClose}
    >
      <ScrollContainer className="grow" innerClassName="flex w-full flex-col gap-8">
        <h2 className="mb-4 text-center font-bold text-md">{t("Review transaction")}</h2>
        {/* Account and delegate section */}
        <div className="flex flex-col gap-4 rounded bg-grey-900 px-8 py-6">
          <div className="flex items-center justify-between gap-8">
            <span className="whitespace-nowrap text-body-secondary text-sm">{t("Account")}</span>
            <AccountDisplay
              address={address}
              ss58Format={network.prefix}
              className="overflow-hidden text-body text-sm"
            />
          </div>
          <div className="flex items-center justify-between gap-8">
            <span className="text-body-secondary text-sm">{t("Network")}</span>
            <div className="flex items-center gap-4 text-body">
              <NetworkLogo networkId={network.id} className="shrink-0 text-lg!" />
              <span className="truncate">{network.name}</span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-8">
            <span className="whitespace-nowrap text-body-secondary text-sm">{t("Delegate")}</span>
            <AccountDisplay
              address={delegate}
              ss58Format={network.prefix}
              className="overflow-hidden text-body text-sm"
            />
          </div>
          <div className="flex items-center justify-between gap-8">
            <span className="text-body-secondary text-sm">{t("Proxy type")}</span>
            <span className="truncate text-body">{proxyType}</span>
          </div>
          <div className="flex items-center justify-between gap-8">
            <span className="text-body-secondary text-sm">{t("Delay")}</span>
            <span className="text-body">{`${delay} ${t("blocks")}`}</span>
          </div>
        </div>
        {/* Transaction details section */}
        <div className="mt-4 flex flex-col gap-4 rounded bg-grey-900 px-8 py-6 text-sm">
          <div className="flex items-center justify-between gap-8">
            <span className="text-body-secondary">{t("Available balance")}</span>
            <span className="text-body">
              {!nativeToken?.id ? (
                <span className="text-body-disabled">{t("N/A")}</span>
              ) : isBalanceLoading ? (
                <Skeleton>{`0 ${nativeToken.symbol}`}</Skeleton>
              ) : (
                <TokensAndFiat
                  tokenId={nativeToken.id}
                  planck={transferablePlanck ?? 0n}
                  noCountUp
                  className="text-body-secondary"
                  tokensClassName="text-body"
                />
              )}
            </span>
          </div>
          <div className="flex items-center justify-between gap-8">
            <span className="text-body-secondary">{t("Reserved deposit")}</span>
            <span className="text-body">
              {additionalReservedDeposit !== null && nativeToken?.id ? (
                <TokensAndFiat
                  tokenId={nativeToken.id}
                  planck={additionalReservedDeposit}
                  noCountUp
                  className="text-body-secondary"
                  tokensClassName="text-body"
                />
              ) : (
                <span className="animate-pulse text-body-disabled">…</span>
              )}
            </span>
          </div>
          <div className="flex items-center justify-between gap-8">
            <span className="text-body-secondary">{t("Network fee")}</span>
            <span className="text-body">
              <StakingFeeEstimate
                plancks={feeEstimate}
                tokenId={nativeToken?.id}
                isLoading={isLoadingFee}
                error={feeError}
                noCountUp
              />
            </span>
          </div>
        </div>
        {insufficientBalance ? (
          /* Insufficient balance warning */
          <div className="flex items-start gap-4 rounded bg-alert-warn/10 px-8 py-6 text-alert-warn text-xs">
            <AlertCircleIcon className="mt-0.5 shrink-0 text-sm" />
            <span>
              {t(
                "Insufficient balance to cover the proxy deposit, network fee, and keep the account alive."
              )}
            </span>
          </div>
        ) : (
          /* Deposit info banner */
          additionalReservedDeposit !== null &&
          nativeToken && (
            <div className="flex items-start gap-4 rounded bg-primary/10 px-8 py-6 text-primary text-xs">
              <AlertCircleIcon className="mt-0.5 shrink-0 text-sm" />
              <span>
                {t(
                  "{{amount}} will be reserved from your balance and returned when this proxy is removed.",
                  {
                    amount: `${formatPlanck(additionalReservedDeposit, nativeToken.decimals)} ${nativeToken.symbol}`,
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
        onSubmitted={handleSubmitted}
        disabled={insufficientBalance}
        className="shrink-0"
      />
    </WizardModalDialog>
  )
}

/** Formats a planck bigint into a human-readable decimal string. */
const formatPlanck = (planck: bigint, decimals: number): string => {
  const str = planck.toString().padStart(decimals + 1, "0")
  const intPart = str.slice(0, str.length - decimals)
  const fracPart = str.slice(str.length - decimals).replace(/0+$/, "")
  return fracPart ? `${intPart}.${fracPart}` : intPart
}
