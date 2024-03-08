import { AccountJsonAny } from "@extension/core"
import { notify } from "@talisman/components/Notifications"
import { useGlobalOpenClose } from "@talisman/hooks/useGlobalOpenClose"
import { CopyIcon, LoaderIcon } from "@talismn/icons"
import { api } from "@ui/api"
import { useSensitiveState } from "@ui/hooks/useSensitiveState"
import { atom, useAtom } from "jotai"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { ModalDialog } from "talisman-ui"
import { Modal } from "talisman-ui"
import { Button } from "talisman-ui"

import { useSelectedAccount } from "../Portfolio/useSelectedAccount"
import { AccountIcon } from "./AccountIcon"
import { PasswordUnlock, usePasswordUnlock } from "./PasswordUnlock"

const accountExportPkAccountState = atom<AccountJsonAny | null>(null)

export const useAccountExportPrivateKeyModal = () => {
  const [_account, setAccount] = useAtom(accountExportPkAccountState)

  const { account: selectedAccount } = useSelectedAccount()
  const { isOpen, open: innerOpen, close } = useGlobalOpenClose("accountExportPkModal")

  const open = useCallback(
    (account?: AccountJsonAny) => {
      setAccount(account ?? null)
      innerOpen()
    },
    [innerOpen, setAccount]
  )

  const account = _account ?? selectedAccount

  const canExportAccountFunc = (account?: AccountJsonAny) =>
    account?.type === "ethereum" && !account.isExternal && !account.isHardware

  const canExportAccount = useMemo(() => canExportAccountFunc(account), [account])

  const exportAccount = useCallback(
    async (password: string) => {
      if (!account) return
      return api.accountExportPrivateKey(account.address, password)
    },
    [account]
  )

  return { account, canExportAccountFunc, canExportAccount, exportAccount, isOpen, open, close }
}

const ExportPrivateKeyResult = ({ onClose }: { onClose?: () => void }) => {
  const { t } = useTranslation()
  const { account, exportAccount } = useAccountExportPrivateKeyModal()
  const { password } = usePasswordUnlock()

  // don't use react-query here as we don't want this to be cached
  const [privateKey, setPrivateKey] = useSensitiveState<string>()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error>()

  const copyToClipboard = useCallback(async () => {
    if (!privateKey) return
    const toastId = "copy"
    try {
      await navigator.clipboard.writeText(privateKey)
      notify(
        {
          type: "success",
          title: t("Copy successful"),
          subtitle: t("Private key copied to clipboard"),
        },
        // set an id to prevent multiple clicks to display multiple notifications
        { toastId }
      )
      return true
    } catch (err) {
      notify(
        {
          type: "error",
          title: t("Copy failed"),
          subtitle: (err as Error).message,
        },
        { toastId }
      )
      return false
    }
  }, [privateKey, t])

  useEffect(() => {
    if (password) {
      setError(undefined)
      setIsLoading(true)
      exportAccount(password)
        .then(setPrivateKey)
        .catch(setError)
        .finally(() => setIsLoading(false))
    }
  }, [exportAccount, password, setPrivateKey])

  useEffect(() => {
    return () => {
      setError(undefined)
      setIsLoading(false)
    }
  }, [])

  if (!account) return null

  return (
    <div className="text-body-secondary flex h-full w-full flex-col text-left">
      <div className="w-full text-left">
        {t(
          "This private key can be used to access your account's funds. Don't share it with anyone."
        )}
      </div>
      <div className="flex w-full grow flex-col justify-center gap-6 ">
        <div className="!text-body flex w-full items-center gap-4">
          <div>
            <AccountIcon address={account.address} className="!text-lg" />
          </div>
          <div className="overflow-hidden text-ellipsis whitespace-nowrap"> {account.name}</div>
        </div>
        <div className="bg-field flex h-28 w-full items-center gap-6 rounded p-8 leading-none">
          {!!error && <div className="text-alert-error">{(error as Error).message}</div>}
          {isLoading && (
            <>
              <div className="text-lg ">
                <LoaderIcon className="animate-spin-slow inline-block " />
              </div>
              <div>{t("Loading...")}</div>
            </>
          )}
          {!!privateKey && (
            <>
              <input
                value={privateKey}
                readOnly
                className="grow bg-transparent font-mono leading-none "
              />
              <button
                type="button"
                onClick={copyToClipboard}
                className=" focus:text-grey-300 text-lg hover:text-white active:text-white"
              >
                <CopyIcon />
              </button>
            </>
          )}
        </div>
      </div>
      <Button className="w-full" onClick={onClose}>
        {t("Close")}
      </Button>
    </div>
  )
}

export const AccountExportPrivateKeyModal = () => {
  const { t } = useTranslation()
  const { isOpen, close } = useAccountExportPrivateKeyModal()

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={close}>
      <ModalDialog title={t("Export private key")} onClose={close} className="w-[50.3rem]">
        <div className="h-[24.2rem]">
          <PasswordUnlock
            className="h-full"
            title={
              <div className="text-body-secondary text-base">
                {t("Please confirm your password to export your account.")}
              </div>
            }
          >
            <ExportPrivateKeyResult onClose={close} />
          </PasswordUnlock>
        </div>
      </ModalDialog>
    </Modal>
  )
}
