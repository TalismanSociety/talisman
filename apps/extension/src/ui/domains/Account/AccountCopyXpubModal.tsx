import type { Account } from "@core/domains/keyring/exports"
import { encodeXpubForDisplay } from "@talismn/crypto"
import { AlertCircleIcon, CopyIcon } from "@talismn/icons"
import { Button } from "@ui/components/Button"
import { Modal } from "@ui/components/Modal"
import { ModalDialog } from "@ui/components/ModalDialog"
import { notify } from "@ui/components/Notifications"
import { createGlobalOpenClose } from "@ui/hooks/createGlobalOpenClose"
import { shortenAddress } from "@ui/util/shortenAddress"
import { type FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

const [useAccountCopyXpubOpenClose] = createGlobalOpenClose<Account>()

export const useAccountCopyXpubModal = () => {
  const { isOpen, open, close, args: account } = useAccountCopyXpubOpenClose()

  return { account, isOpen, open, close }
}

type XpubEntry = {
  key: string
  label: string
  description: string
  value: string
}

// export keys with the SLIP-132 version bytes other wallets expect: zpub for the
// BIP84 payments tree, plain xpub for the BIP86 taproot tree (which never adopted
// SLIP-132 prefixes). Internal storage keeps the canonical xpub form.
const useXpubEntries = (account: Account | null): XpubEntry[] => {
  const { t } = useTranslation()

  return useMemo(() => {
    if (!account) return []

    if (account.type === "hd-bitcoin" || account.type === "ledger-bitcoin")
      return [
        {
          key: "payments",
          label: t("Payments"),
          description: t("Native SegWit (zpub)"),
          value: encodeXpubForDisplay(account.keys.payments.xpub, "p2wpkh"),
        },
        {
          key: "ordinals",
          label: t("Ordinals"),
          description: t("Taproot (xpub)"),
          value: encodeXpubForDisplay(account.keys.ordinals.xpub, "p2tr"),
        },
      ]

    // watched account: hand back the key exactly as it was pasted in
    return [
      {
        key: "watched",
        label: t("Watched key"),
        description: "",
        value: account.address,
      },
    ]
  }, [account, t])
}

const XpubRow: FC<{ entry: XpubEntry }> = ({ entry }) => {
  const { t } = useTranslation()

  const handleCopy = useCallback(async () => {
    const toastId = `copy_${entry.value}`
    try {
      await navigator.clipboard.writeText(entry.value)
      notify(
        {
          type: "success",
          title: t("Xpub copied"),
          subtitle: shortenAddress(entry.value, 6, 6),
        },
        { toastId }
      )
    } catch {
      notify(
        {
          type: "error",
          title: t("Copy failed"),
          subtitle: shortenAddress(entry.value, 6, 6),
        },
        { toastId }
      )
    }
  }, [entry.value, t])

  return (
    <div className="flex flex-col gap-2 rounded-sm bg-grey-850 p-6">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-bold text-body">{entry.label}</span>
          {entry.description && (
            <span className="ml-4 text-body-disabled text-xs">{entry.description}</span>
          )}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex cursor-pointer items-center gap-2 border-none bg-transparent p-0 text-body-secondary hover:text-body"
        >
          <CopyIcon className="text-sm" />
          <span className="text-xs">{t("Copy")}</span>
        </button>
      </div>
      <div className="select-all break-all font-mono text-body-secondary text-xs">
        {entry.value}
      </div>
    </div>
  )
}

export const AccountCopyXpubModal = () => {
  const { t } = useTranslation()
  const { account, close, isOpen } = useAccountCopyXpubModal()
  const entries = useXpubEntries(account)

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={close}>
      <ModalDialog title={t("Copy xpub")} onClose={close}>
        <div className="flex flex-col gap-8 text-body-secondary text-sm">
          <div className="flex items-center gap-6 rounded-sm bg-grey-800 p-6">
            <AlertCircleIcon className="shrink-0 text-alert-warn text-lg" />
            <p>
              {t(
                "Anyone with an xpub can see the balance and full transaction history of this account, including all future addresses. It cannot be used to spend funds."
              )}
            </p>
          </div>
          {entries.map((entry) => (
            <XpubRow key={entry.key} entry={entry} />
          ))}
          <Button type="button" onClick={close}>
            {t("Close")}
          </Button>
        </div>
      </ModalDialog>
    </Modal>
  )
}
