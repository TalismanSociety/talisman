import type { AccountProxyEntry, AccountProxySet } from "@core/domains/accountProxies/types"
import { Enum } from "@polkadot-api/substrate-bindings"
import { TrashIcon } from "@talismn/icons"
import { api } from "@ui/api"
import { Button } from "@ui/components/Button"
import { Modal } from "@ui/components/Modal"
import { notify } from "@ui/components/Notifications"
import { PopupSizeModalContainer } from "@ui/components/PopupSizeModalContainer"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import { PasswordUnlock } from "@ui/domains/Account/PasswordUnlock"
import { SapiSendButton } from "@ui/domains/Transactions/SapiSendButton"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useProxyTypesForNetwork } from "@ui/hooks/useProxyTypesForNetwork"
import { useAccountCanWriteProxies, useAccountProxySetsForAddress } from "@ui/state/accountProxies"
import { useAccountByAddress } from "@ui/state/accounts"
import { useNetworkById } from "@ui/state/chaindata"
import { type FC, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import type { Hex } from "viem"

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
  const { close: closeManage } = useManageProxyModal()
  const { open: triggerOpenAdd } = useAddProxyModal()

  if (!account) return null

  if (removeTarget) {
    return (
      <RemoveProxyConfirm
        address={address}
        target={removeTarget}
        onCancel={() => setRemoveTarget(null)}
        onClose={onClose}
      />
    )
  }

  const totalProxies = sets.reduce((acc, s) => acc + s.proxies.length, 0)

  return (
    <WizardModalDialog title={t("Manage Proxies")} onCloseClick={onClose}>
      <div className="flex grow flex-col gap-8">
        <div className="flex items-center justify-between">
          <span className="text-body-secondary text-sm">
            {t("{{count}} proxy", { count: totalProxies })}
          </span>
          <Button
            small
            primary
            disabled={!canWrite}
            onClick={() => {
              closeManage()
              triggerOpenAdd({ address })
            }}
          >
            {t("+ Add")}
          </Button>
        </div>
        {!canWrite && (
          <p className="text-alert-warn text-xs">
            {t(
              "This account type can't sign proxy management extrinsics yet. Read-only view shown."
            )}
          </p>
        )}
        <div className="scrollable scrollable-800 flex grow flex-col gap-2 overflow-auto">
          {sets.length === 0 && <p className="text-body-secondary">{t("No proxies found.")}</p>}
          {sets.flatMap((set) =>
            set.proxies.map((entry, i) => (
              <ProxyRow
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

const ProxyRow: FC<{
  set: AccountProxySet
  entry: AccountProxyEntry
  canDelete: boolean
  onDelete: () => void
}> = ({ set, entry, canDelete, onDelete }) => {
  const { t } = useTranslation()
  const network = useNetworkById(set.networkId)
  const proxyTypes = useProxyTypesForNetwork(set.networkId)
  const requiresAnnouncement = entry.delay !== "0"

  const proxyTypeDocs = useMemo(
    () => proxyTypes.find((pt) => pt.name === entry.proxyType)?.docs ?? "",
    [proxyTypes, entry.proxyType]
  )

  return (
    <div className="flex items-center gap-4 rounded bg-grey-900 p-4">
      <div className="flex grow flex-col overflow-hidden text-sm">
        <span className="truncate font-mono text-xs">{entry.delegate}</span>
        <div className="flex gap-2 text-body-secondary text-xs">
          <span>{network?.name ?? set.networkId}</span>
          <span>·</span>
          <span title={proxyTypeDocs || undefined}>{entry.proxyType}</span>
          {requiresAnnouncement && (
            <>
              <span>·</span>
              <span className="text-alert-warn" title={t("Requires announcement workflow")}>
                {t("delayed")}
              </span>
            </>
          )}
        </div>
      </div>
      <button
        type="button"
        disabled={!canDelete}
        onClick={onDelete}
        className="rounded p-2 text-body-secondary hover:text-alert-warn disabled:cursor-not-allowed disabled:opacity-50"
        title={t("Remove proxy")}
      >
        <TrashIcon />
      </button>
    </div>
  )
}

const RemoveProxyConfirm: FC<{
  address: string
  target: RemoveTarget
  onCancel: () => void
  onClose: () => void
}> = ({ address, target, onCancel, onClose }) => {
  const { t } = useTranslation()
  const network = useNetworkById(target.networkId)
  const { data: sapi } = useScaleApi(target.networkId as `0x${string}` | string)
  const [payload, setPayload] = useState<Awaited<
    ReturnType<NonNullable<typeof sapi>["getExtrinsicPayload"]>
  > | null>(null)

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
    api.accountProxiesRefresh({ networkId: target.networkId, address }).catch(() => {})
    notify({ type: "success", title: t("Remove proxy submitted"), subtitle: hash })
    onClose()
  }

  return (
    <WizardModalDialog title={t("Remove Proxy")} onCloseClick={onClose}>
      <div className="flex grow flex-col gap-4 text-sm">
        <Field label={t("Network")} value={network?.name ?? target.networkId} />
        <Field label={t("Delegate")} value={target.entry.delegate} mono />
        <Field label={t("Proxy type")} value={target.entry.proxyType} />
        <Field label={t("Delay")} value={`${target.entry.delay} ${t("blocks")}`} />
      </div>
      <p className="my-4 text-body-secondary text-xs">
        {t("Enter your password to authorise this transaction.")}
      </p>
      <div className="flex flex-col gap-4">
        <Button onClick={onCancel}>{t("Cancel")}</Button>
        <PasswordUnlock buttonText={t("Unlock to sign")}>
          <SapiSendButton
            containerId="manage-proxy-modal"
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
