import type { Account } from "@core/domains/keyring/exports"
import { bind } from "@react-rxjs/core"
import { AlertCircleIcon } from "@talismn/icons"
import { Button } from "@ui/components/Button"
import { Modal } from "@ui/components/Modal"
import { ModalDialog } from "@ui/components/ModalDialog"
import { notify } from "@ui/components/Notifications"
import { useGlobalOpenClose } from "@ui/hooks/useGlobalOpenClose"
import { shortenAddress } from "@ui/util/shortenAddress"
import { isEqual } from "lodash-es"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { BehaviorSubject, distinctUntilChanged } from "rxjs"

const account$ = new BehaviorSubject<Account | null>(null)
const [useAccount] = bind(account$.pipe(distinctUntilChanged<Account | null>(isEqual)), null)

export const useAccountCopyXpubModal = () => {
  const account = useAccount()
  const { isOpen, open: innerOpen, close } = useGlobalOpenClose("accountCopyXpubModal")

  const open = useCallback(
    (account: Account) => {
      account$.next(account)
      innerOpen()
    },
    [innerOpen]
  )

  return { account, isOpen, open, close }
}

export const AccountCopyXpubModal = () => {
  const { t } = useTranslation()
  const { account, close, isOpen } = useAccountCopyXpubModal()

  const handleCopy = useCallback(async () => {
    if (!account) return
    const toastId = `copy_${account.address}`
    try {
      await navigator.clipboard.writeText(account.address)
      notify(
        {
          type: "success",
          title: t("Xpub copied"),
          subtitle: shortenAddress(account.address, 6, 6),
        },
        { toastId }
      )
      close()
    } catch {
      notify(
        {
          type: "error",
          title: t("Copy failed"),
          subtitle: shortenAddress(account.address, 6, 6),
        },
        { toastId }
      )
    }
  }, [account, close, t])

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={close}>
      <ModalDialog title={t("Copy xpub")} onClose={close}>
        <div className="flex flex-col gap-8 text-body-secondary text-sm">
          <div className="flex items-center gap-6 rounded-sm bg-grey-800 p-6">
            <AlertCircleIcon className="shrink-0 text-alert-warn text-lg" />
            <p>
              {t(
                "Anyone with this xpub can see the balance and full transaction history of this account, including all future addresses. It cannot be used to spend funds."
              )}
            </p>
          </div>
          <div className="select-all break-all rounded-sm bg-grey-850 p-6 font-mono text-body text-xs">
            {account?.address}
          </div>
          <div className="grid grid-cols-2 gap-8">
            <Button type="button" onClick={close}>
              {t("Cancel")}
            </Button>
            <Button primary onClick={handleCopy}>
              {t("Copy")}
            </Button>
          </div>
        </div>
      </ModalDialog>
    </Modal>
  )
}
