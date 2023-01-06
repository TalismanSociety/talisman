import { Modal } from "@talisman/components/Modal"
import { ModalDialog } from "@talisman/components/ModalDialog"
import { notify } from "@talisman/components/Notifications"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { CopyIcon, LoaderIcon } from "@talisman/theme/icons"
import { provideContext } from "@talisman/util/provideContext"
import { useQuery } from "@tanstack/react-query"
import { api } from "@ui/api"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "talisman-ui"

import { useSelectedAccount } from "../Portfolio/SelectedAccountContext"
import AccountAvatar from "./Avatar"
import { PasswordUnlock, usePasswordUnlock } from "./PasswordUnlock"

const useAccountExportPrivateKeyModalProvider = () => {
  const { account } = useSelectedAccount()
  const { isOpen, open, close } = useOpenClose()

  useEffect(() => {
    close()
  }, [account, close])

  const canExportAccount = useMemo(() => account?.type === "ethereum", [account])

  const exportAccount = useCallback(
    (password: string) => {
      if (!account) return
      return api.accountExportPrivateKey(account.address, password)
    },
    [account]
  )

  return { account, canExportAccount, exportAccount, isOpen, open, close }
}

export const [AccountExportPrivateKeyModalProvider, useAccountExportPrivateKeyModal] =
  provideContext(useAccountExportPrivateKeyModalProvider)

const ExportPrivateKeyResult = ({ onClose }: { onClose?: () => void }) => {
  const { account, exportAccount } = useAccountExportPrivateKeyModal()
  const { password } = usePasswordUnlock()

  // force password check each time this component is rendered
  const [id] = useState(() => crypto.randomUUID())
  const {
    error,
    data: privateKey,
    isLoading,
  } = useQuery({
    queryKey: ["accountExportPrivateKey", id, !!password],
    queryFn: () => (password ? exportAccount(password) : null),
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  const copyToClipboard = useCallback(async () => {
    if (!privateKey) return
    const toastId = "copy"
    try {
      await navigator.clipboard.writeText(privateKey)
      notify(
        {
          type: "success",
          title: "Copy successful",
          subtitle: "Private key copied to clipboard",
        },
        // set an id to prevent multiple clicks to display multiple notifications
        { toastId }
      )
      return true
    } catch (err) {
      notify(
        {
          type: "error",
          title: `Copy failed`,
          subtitle: (err as Error).message,
        },
        { toastId }
      )
      return false
    }
  }, [privateKey])

  if (!account) return null

  return (
    <div className="text-body-secondary flex h-full w-full flex-col text-left">
      <div className="w-full text-left">
        This private key can be used to access your account's funds. Don't share it with anyone.
      </div>
      <div className="flex w-full grow flex-col justify-center gap-6 ">
        <div className="!text-body flex w-full items-center gap-4">
          <div>
            <AccountAvatar address={account.address} className="!text-lg" />
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
              <div>Loading...</div>
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
        Close
      </Button>
    </div>
  )
}

export const AccountExportPrivateKeyModal = () => {
  const { isOpen, close } = useAccountExportPrivateKeyModal()

  return (
    <Modal open={isOpen} onClose={close}>
      <ModalDialog title="Export private key" onClose={close} className="w-[50.3rem]">
        <div className="h-[24.2rem]">
          <PasswordUnlock
            title=""
            description={
              <div className="text-body-secondary mb-8">
                Please confirm your password to export your account.
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
