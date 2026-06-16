import type { AccountProxyEntry, AccountProxySet } from "@core/domains/accountProxies/types"
import { AlertCircleIcon, TrashIcon } from "@talismn/icons"
import { api } from "@ui/api"
import { Button } from "@ui/components/Button"
import { Modal } from "@ui/components/Modal"
import { PopupSizeModalContainer } from "@ui/components/PopupSizeModalContainer"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import { AccountDisplay } from "@ui/domains/Earn/shared/AccountDisplay"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { SapiSendButton } from "@ui/domains/Transactions/SapiSendButton"
import { TxProgress } from "@ui/domains/Transactions/TxProgress"
import { useAccountCanWriteProxies, useAccountProxySetsForAddress } from "@ui/state/accountProxies"
import { useAccountByAddress } from "@ui/state/accounts"
import { useNetworkById } from "@ui/state/chaindata"
import { type FC, useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import type { Hex } from "viem"
import { useAddProxyModal } from "../AddProxy/useAddProxyModal"
import { ProxyActionSummary } from "../ProxyActionSummary"
import { ProxyCostBreakdown } from "../ProxyCostBreakdown"
import { useProxyTxPreview } from "../useProxyTxPreview"
import { useRefreshAccountProxiesOnTxSuccess } from "../useRefreshAccountProxiesOnTxSuccess"
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

  const attemptedRef = useRef(new Set<string>())

  useEffect(() => {
    for (const set of sets) {
      const key = `${set.networkId}:${address}`
      if (set.proxyCount > 0 && set.proxies.length === 0 && !attemptedRef.current.has(key)) {
        attemptedRef.current.add(key)
        api.accountProxiesLoadDetails({ networkId: set.networkId, address }).catch(() => {})
      }
    }
  }, [sets, address])

  const hasProxiesWithCount = sets.some((s) => s.proxyCount > 0)
  const isLoadingDetails = sets.some((s) => s.proxyCount > 0 && s.proxies.length === 0)

  const handleSubmitted = useCallback(
    (hash: Hex) => {
      if (!removeTarget) return
      setSubmittedHash(hash)
      setSubmittedNetworkId(removeTarget.networkId)
    },
    [removeTarget]
  )

  useRefreshAccountProxiesOnTxSuccess({
    hash: submittedHash,
    networkId: submittedNetworkId,
    address,
  })

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
          {!hasProxiesWithCount && !isLoadingDetails && (
            <p className="text-body-secondary">{t("No proxies found.")}</p>
          )}
          {isLoadingDetails && <p className="text-body-secondary">{t("Loading proxy details…")}</p>}
          {sets.flatMap((set) =>
            set.proxies.map((entry) => (
              <ProxyCard
                key={`${set.networkId}-${entry.delegate}-${entry.proxyType}-${entry.delay}`}
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

  const preview = useProxyTxPreview({
    networkId: target.networkId,
    nativeTokenId: network?.nativeTokenId,
    accountAddress: address,
    delegateAddress: target.entry.delegate,
    proxyType: target.entry.proxyType,
    delay: Number(target.entry.delay),
    method: "remove_proxy",
  })

  const { payload, isAffordabilityCheckUnavailable, insufficientBalance } = preview

  return (
    <WizardModalDialog
      title={t("Remove Proxy")}
      contentClassName="flex flex-col"
      onBackClick={onCancel}
      onCloseClick={onClose}
    >
      <div className="flex size-full flex-col gap-8 overflow-hidden">
        <h2 className="mb-4 text-center font-bold text-md">{t("Confirm Proxy Removal")}</h2>
        <ProxyActionSummary
          accountAddress={address}
          networkId={target.networkId}
          networkName={network?.name}
          networkPrefix={network?.prefix}
          delegateAddress={target.entry.delegate}
          proxyType={target.entry.proxyType}
          delay={Number(target.entry.delay)}
        />
        <ProxyCostBreakdown preview={preview} depositLabel={t("Deposit unlocked")} />
        {insufficientBalance && (
          <div className="flex items-start gap-4 rounded bg-alert-warn/10 px-8 py-6 text-alert-warn text-xs">
            <AlertCircleIcon className="mt-0.5 shrink-0 text-sm" />
            <span>
              {t("Insufficient balance to cover the network fee and keep the account alive.")}
            </span>
          </div>
        )}
        <div className="grow" />
        <SapiSendButton
          containerId="manage-proxy-modal"
          label={t("Remove")}
          payload={payload?.payload}
          txMetadata={payload?.txMetadata}
          onSubmitted={onSubmitted}
          disabled={isAffordabilityCheckUnavailable || insufficientBalance}
          checkPassword
        />
      </div>
    </WizardModalDialog>
  )
}
