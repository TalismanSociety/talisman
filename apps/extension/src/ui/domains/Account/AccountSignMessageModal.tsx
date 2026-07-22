import type { Account } from "@core/domains/keyring/exports"
import { bind } from "@react-rxjs/core"
import { CopyIcon } from "@talismn/icons"
import { api } from "@ui/api"
import { Button } from "@ui/components/Button"
import { Modal } from "@ui/components/Modal"
import { ModalDialog } from "@ui/components/ModalDialog"
import { notify } from "@ui/components/Notifications"
import { useGlobalOpenClose } from "@ui/hooks/useGlobalOpenClose"
import { shortenAddress } from "@ui/util/shortenAddress"
import { isEqual } from "lodash-es"
import { type FC, useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { BehaviorSubject, distinctUntilChanged } from "rxjs"

const account$ = new BehaviorSubject<Account | null>(null)
const [useAccount] = bind(account$.pipe(distinctUntilChanged<Account | null>(isEqual)), null)

export const useAccountSignMessageModal = () => {
  const account = useAccount()
  const { isOpen, open: innerOpen, close } = useGlobalOpenClose("accountSignMessageModal")

  const open = useCallback(
    (account: Account) => {
      account$.next(account)
      innerOpen()
    },
    [innerOpen]
  )

  return { account, isOpen, open, close }
}

const CopyButton: FC<{ value: string; label: string }> = ({ value, label }) => {
  const { t } = useTranslation()
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value)
      notify({ type: "success", title: t("{{label}} copied", { label }) })
    } catch {
      notify({ type: "error", title: t("Copy failed") })
    }
  }, [value, label, t])

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex cursor-pointer items-center gap-2 border-none bg-transparent p-0 text-body-secondary hover:text-body"
    >
      <CopyIcon className="text-sm" />
      <span className="text-xs">{t("Copy")}</span>
    </button>
  )
}

/**
 * Signs an arbitrary message with the account's first bitcoin receive address using
 * BIP322 (simple) — the format Bitcoin Core, Sparrow and ordinals platforms verify.
 */
export const AccountSignMessageModal = () => {
  const { t } = useTranslation()
  const { account, close, isOpen } = useAccountSignMessageModal()

  const [message, setMessage] = useState("")
  const [isSigning, setIsSigning] = useState(false)
  const [result, setResult] = useState<{ address: string; signature: string } | null>(null)

  const handleClose = useCallback(() => {
    setMessage("")
    setResult(null)
    close()
  }, [close])

  const handleSign = useCallback(async () => {
    if (!account) return
    setIsSigning(true)
    try {
      const signed = await api.btcSignMessage({ address: account.address, message })
      setResult(signed)
    } catch (err) {
      notify({
        type: "error",
        title: t("Failed to sign"),
        subtitle: (err as Error)?.message,
      })
    } finally {
      setIsSigning(false)
    }
  }, [account, message, t])

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={handleClose}>
      <ModalDialog title={t("Sign message")} onClose={handleClose}>
        <div className="flex flex-col gap-8 text-body-secondary text-sm">
          <p>
            {t(
              "Prove ownership of this account by signing a message with your first receive address (BIP322)."
            )}
          </p>
          <textarea
            value={message}
            onChange={(e) => {
              setMessage(e.target.value)
              setResult(null)
            }}
            rows={4}
            placeholder={t("Message to sign")}
            className="resize-none rounded-sm border-none bg-grey-850 p-6 font-mono text-body text-xs outline-hidden"
          />
          {result && (
            <>
              <div className="flex flex-col gap-2 rounded-sm bg-grey-850 p-6">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-body">{t("Address")}</span>
                  <CopyButton value={result.address} label={t("Address")} />
                </div>
                <div className="break-all font-mono text-xs">
                  {shortenAddress(result.address, 10, 10)}
                </div>
              </div>
              <div className="flex flex-col gap-2 rounded-sm bg-grey-850 p-6">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-body">{t("Signature")}</span>
                  <CopyButton value={result.signature} label={t("Signature")} />
                </div>
                <div className="select-all break-all font-mono text-xs">{result.signature}</div>
              </div>
            </>
          )}
          <div className="grid grid-cols-2 gap-8">
            <Button type="button" onClick={handleClose}>
              {t("Close")}
            </Button>
            <Button primary onClick={handleSign} processing={isSigning} disabled={!message.length}>
              {t("Sign")}
            </Button>
          </div>
        </div>
      </ModalDialog>
    </Modal>
  )
}
