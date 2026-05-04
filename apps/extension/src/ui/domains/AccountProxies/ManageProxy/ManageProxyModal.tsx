import type { AccountProxyEntry, AccountProxySet } from "@core/domains/accountProxies/types"
import { Enum } from "@polkadot-api/substrate-bindings"
import { TrashIcon } from "@talismn/icons"
import { api } from "@ui/api"
import { Button } from "@ui/components/Button"
import { Modal } from "@ui/components/Modal"
import { notify } from "@ui/components/Notifications"
import { PopupSizeModalContainer } from "@ui/components/PopupSizeModalContainer"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { AccountDisplay } from "@ui/domains/Earn/shared/AccountDisplay"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { StakingFeeEstimate } from "@ui/domains/Staking/shared/StakingFeeEstimate"
import { SapiSendButton } from "@ui/domains/Transactions/SapiSendButton"
import { TxProgress } from "@ui/domains/Transactions/TxProgress"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useAccountCanWriteProxies, useAccountProxySetsForAddress } from "@ui/state/accountProxies"
import { useAccountByAddress } from "@ui/state/accounts"
import { useNetworkById, useToken } from "@ui/state/chaindata"
import { type FC, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import type { Hex } from "viem"
import { useGetFeeEstimate } from "../../Staking/shared/useGetFeeEstimate"
import { useAddProxyModal } from "../AddProxy/useAddProxyModal"
import { useManageProxyModal } from "./useManageProxyModal"

type RemoveTarget = { networkId: string; entry: AccountProxyEntry }

export const ManageProxyModal: FC = () => {
  const { isOpen, args, close } = useManageProxyModal()
  return (
    <Modal isOpen={isOpen && !!args?.address} onDismiss={close}>
      <PopupSizeModalContainer id="manage-proxy-modal">
        {!!args?.address && <ManageProxyContent address={args.address} onClose={close} />}
      </PopupSizeModalContainer>
    </Modal>
  )
}

const ManageProxyContent: FC<{ address: string; onClose: () => void }> = ({ address, onClose }) => {
  const { t } = useTranslation()
  const account = useAccountByAddress(address)
  const sets = useAccountProxySetsForAddress(address)
  const canWrite = useAccountCanWriteProxies(address)
  const [removeTarget, setRemoveTarget] = useState<RemoveTarget | null>(null)
  const [submittedHash, setSubmittedHash] = useState<string | null>(null)
  const [submittedNetworkId, setSubmittedNetworkId] = useState<string | null>(null)
  const { close: closeManage } = useManageProxyModal()
  const { open: triggerOpenAdd } = useAddProxyModal()

  const handleSubmitted = useCallback(
    (hash: Hex) => {
      if (!removeTarget) return
      setSubmittedHash(hash)
      setSubmittedNetworkId(removeTarget.networkId)
      api.accountProxiesRefresh({ networkId: removeTarget.networkId, address }).catch(() => {})
    },
    [removeTarget, address]
  )

  if (!account) return null

  if (submittedHash && submittedNetworkId) {
    return (
      <div className="size-full p-12">
        <TxProgress hash={submittedHash} networkIdOrHash={submittedNetworkId} onClose={onClose} />
      </div>
    )
  }

  if (removeTarget) {
    return (
      <RemoveProxyConfirm
        address={address}
        target={removeTarget}
        onCancel={() => setRemoveTarget(null)}
        onSubmitted={handleSubmitted}
        onClose={onClose}
      />
    )
  }

  return (
    <WizardModalDialog title={t("Manage Proxies")} onCloseClick={onClose}>
      <div className="flex grow flex-col gap-8">
        <div className="flex items-center justify-between gap-4">
          <AccountDisplay address={address} className="overflow-hidden text-base" />
          <Button
            small
            disabled={!canWrite}
            onClick={() => {
              closeManage()
              triggerOpenAdd({ address })
            }}
          >
            {t("Add Proxy")}
          </Button>
        </div>
        {!canWrite && (
          <p className="text-alert-warn text-xs">
            {t(
              "This account type can't sign proxy management extrinsics yet. Read-only view shown."
            )}
          </p>
        )}
        <div className="scrollable scrollable-800 flex grow flex-col gap-4 overflow-auto">
          {sets.length === 0 && <p className="text-body-secondary">{t("No proxies found.")}</p>}
          {sets.flatMap((set) =>
            set.proxies.map((entry, i) => (
              <ProxyCard
                key={`${set.networkId}-${entry.delegate}-${entry.proxyType}-${entry.delay}-${i}`}
                set={set}
                entry={entry}
                canDelete={canWrite}
                onDelete={() => setRemoveTarget({ networkId: set.networkId, entry })}
              />
            ))
          )}
        </div>
      </div>
    </WizardModalDialog>
  )
}

const ProxyCard: FC<{
  set: AccountProxySet
  entry: AccountProxyEntry
  canDelete: boolean
  onDelete: () => void
}> = ({ set, entry, canDelete, onDelete }) => {
  const { t } = useTranslation()
  const network = useNetworkById(set.networkId, "polkadot")

  return (
    <div className="flex flex-col gap-4 rounded bg-grey-900 p-8">
      <div className="flex items-center justify-between gap-4">
        <AccountDisplay
          address={entry.delegate}
          ss58Format={network?.prefix}
          className="overflow-hidden text-base"
        />
        <button
          type="button"
          disabled={!canDelete}
          onClick={onDelete}
          className="shrink-0 rounded p-2 text-body-secondary hover:text-alert-warn disabled:cursor-not-allowed disabled:opacity-50"
          title={t("Remove proxy")}
        >
          <TrashIcon />
        </button>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-body-secondary">{t("Network")}</span>
        <span className="flex items-center gap-2">
          <NetworkLogo networkId={set.networkId} className="text-base" />
          {network?.name ?? set.networkId}
        </span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-body-secondary">{t("Proxy type")}</span>
        <span>{entry.proxyType}</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-body-secondary">{t("Delay")}</span>
        <span>{entry.delay}</span>
      </div>
    </div>
  )
}

const RemoveProxyConfirm: FC<{
  address: string
  target: RemoveTarget
  onCancel: () => void
  onSubmitted: (hash: Hex) => void
  onClose: () => void
}> = ({ address, target, onCancel, onSubmitted, onClose }) => {
  const { t } = useTranslation()
  const network = useNetworkById(target.networkId, "polkadot")
  const nativeToken = useToken(network?.nativeTokenId)
  const { data: sapi } = useScaleApi(target.networkId as `0x${string}` | string)
  const [payload, setPayload] = useState<Awaited<
    ReturnType<NonNullable<typeof sapi>["getExtrinsicPayload"]>
  > | null>(null)

  // Compute deposit that will be unlocked after removing this proxy
  const proxySets = useAccountProxySetsForAddress(address)
  const existingProxyCount = useMemo(
    () =>
      proxySets
        .filter((s) => s.networkId === target.networkId)
        .reduce((sum, s) => sum + s.proxies.length, 0),
    [proxySets, target.networkId]
  )

  const depositUnlocked = useMemo(() => {
    if (!sapi || existingProxyCount <= 0) return null
    try {
      const base = sapi.getConstant<bigint>("Proxy", "ProxyDepositBase")
      const factor = sapi.getConstant<bigint>("Proxy", "ProxyDepositFactor")
      const currentDeposit = base + factor * BigInt(existingProxyCount)
      const newCount = existingProxyCount - 1
      const newDeposit = newCount > 0 ? base + factor * BigInt(newCount) : 0n
      return currentDeposit - newDeposit
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

  useEffect(() => {
    if (!sapi) return
    let cancelled = false
    sapi
      .getExtrinsicPayload(
        "Proxy",
        "remove_proxy",
        {
          delegate: { type: "Id", value: target.entry.delegate },
          proxy_type: Enum(target.entry.proxyType),
          delay: Number(target.entry.delay),
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
  }, [address, sapi, t, target.entry.delay, target.entry.delegate, target.entry.proxyType])

  const handleSubmitted = (hash: Hex) => {
    onSubmitted(hash)
  }

  return (
    <WizardModalDialog
      title={t("Remove Proxy")}
      contentClassName="flex flex-col"
      onBackClick={onCancel}
      onCloseClick={onClose}
    >
      <div className="flex size-full flex-col gap-8 overflow-hidden">
        <h2 className="mb-4 text-center font-bold text-md">{t("Confirm Proxy Removal")}</h2>
        <div className="flex flex-col gap-4 rounded bg-grey-900 px-8 py-6">
          <div className="flex items-center justify-between gap-8">
            <span className="whitespace-nowrap text-body-secondary text-sm">{t("Account")}</span>
            <AccountDisplay
              address={address}
              ss58Format={network?.prefix}
              className="overflow-hidden text-body text-sm"
            />
          </div>
          <div className="flex items-center justify-between gap-8">
            <span className="whitespace-nowrap text-body-secondary text-sm">{t("Network")}</span>
            <div className="flex items-center gap-4 text-body text-sm">
              <NetworkLogo networkId={target.networkId} className="shrink-0 text-lg!" />
              <span className="truncate">{network?.name ?? target.networkId}</span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-8">
            <span className="whitespace-nowrap text-body-secondary text-sm">{t("Delegate")}</span>
            <AccountDisplay
              address={target.entry.delegate}
              ss58Format={network?.prefix}
              className="overflow-hidden text-body text-sm"
            />
          </div>
          <div className="flex items-center justify-between gap-8">
            <span className="whitespace-nowrap text-body-secondary text-sm">{t("Proxy type")}</span>
            <span className="truncate text-body text-sm">{target.entry.proxyType}</span>
          </div>
          <div className="flex items-center justify-between gap-8">
            <span className="whitespace-nowrap text-body-secondary text-sm">{t("Delay")}</span>
            <span className="text-body text-sm">{`${target.entry.delay} ${t("blocks")}`}</span>
          </div>
        </div>
        <div className="flex flex-col gap-4 rounded bg-grey-900 px-8 py-6 text-sm">
          <div className="flex items-center justify-between gap-8">
            <span className="text-body-secondary">{t("Deposit unlocked")}</span>
            <span className="text-body">
              {depositUnlocked !== null && nativeToken?.id ? (
                <TokensAndFiat
                  tokenId={nativeToken.id}
                  planck={depositUnlocked}
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
        <div className="grow" />
        <SapiSendButton
          containerId="manage-proxy-modal"
          label={t("Remove")}
          payload={payload?.payload}
          txMetadata={payload?.txMetadata}
          onSubmitted={handleSubmitted}
        />
      </div>
    </WizardModalDialog>
  )
}
