import { AccountJsonAny } from "@core/domains/accounts/types"
import { Accordion, AccordionIcon } from "@talisman/components/Accordion"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Spacer } from "@talisman/components/Spacer"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import {
  AlertCircleIcon,
  CornerDownRightIcon,
  InfoIcon,
  MoreHorizontalIcon,
  SeedIcon,
  XIcon,
} from "@talisman/theme/icons"
import { classNames } from "@talismn/util"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { Address } from "@ui/domains/Account/Address"
import useAccounts from "@ui/hooks/useAccounts"
import useMnemonicBackup from "@ui/hooks/useMnemonicBackup"
import { FC, useCallback, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  IconButton,
} from "talisman-ui"

import { DashboardLayout } from "../../../layout/DashboardLayout"
import {
  MnemonicBackupModal,
  MnemonicBackupModalProvider,
  useMnemonicBackupModal,
} from "./MnemonicBackupModal"
import {
  MnemonicDeleteModal,
  MnemonicDeleteModalProvider,
  useMnemonicDeleteModal,
} from "./MnemonicDeleteModal"
import {
  MnemonicRenameModal,
  MnemonicRenameModalProvider,
  useMnemonicRenameModal,
} from "./MnemonicRenameModal"
import {
  MnemonicSetPvVerifierModal,
  MnemonicSetPvVerifierModalProvider,
  useMnemonicSetPvVerifierModal,
} from "./MnemonicSetPvVerifierModal"
import { Mnemonic, useMnemonics } from "./useMnemonics"

const useMnemonicAccounts = (mnemonicId: string) => {
  const accounts = useAccounts("owned")
  return accounts.filter((account) => account.derivedMnemonicId === mnemonicId)
}

const AccountRow: FC<{ account: AccountJsonAny }> = ({ account }) => {
  return (
    <div className="text-body-secondary bg-grey-900 mt-4 flex h-[4.8rem] w-full items-center gap-6 overflow-hidden rounded-sm px-8">
      <AccountIcon
        className="text-lg"
        address={account.address}
        genesisHash={account.genesisHash}
      />
      <div className="flex grow flex-col gap-1 overflow-hidden">
        <div className="text-body max-w-full truncate text-sm">{account.name}</div>
        <div className="text-body-secondary text-xs">
          <Address address={account.address} startCharCount={6} endCharCount={6} />
        </div>
      </div>
    </div>
  )
}

const AccountsStack: FC<{ accounts: AccountJsonAny[] }> = ({ accounts }) => {
  return (
    <div className="ml-[0.4em] inline-block h-9 pl-0.5 leading-none [&>div]:ml-[-0.4em]">
      {accounts.slice(0, 3).map((account) => (
        <AccountIcon
          key={account.address}
          address={account.address}
          className="border-grey-800 box-content shrink-0 rounded-full border text-base"
        />
      ))}
    </div>
  )
}

const MnemonicRow: FC<{ mnemonic: Mnemonic }> = ({ mnemonic }) => {
  const { t } = useTranslation("admin")
  const { isOpen, toggle } = useOpenClose()
  const { open: openRename } = useMnemonicRenameModal()
  const { open: openSetPvVerifier, isVerifier } = useMnemonicSetPvVerifierModal()
  const { open: openDelete, canDelete } = useMnemonicDeleteModal()
  const { open: openBackup, isBackupConfirmed } = useMnemonicBackupModal()
  const refActions = useRef<HTMLDivElement>(null)
  const refBackup = useRef<HTMLButtonElement>(null)

  const [actionsWidth, setActionsWidth] = useState<number>()
  const actionsStyle = useMemo(() => ({ width: actionsWidth }), [actionsWidth])

  useLayoutEffect(() => {
    setActionsWidth(refActions.current?.clientWidth)
  }, [])

  const accounts = useMnemonicAccounts(mnemonic.id)

  const handleRenameClick = useCallback(() => {
    openRename(mnemonic.id)
  }, [mnemonic.id, openRename])

  const handleSetVerifierClick = useCallback(() => {
    openSetPvVerifier(mnemonic.id)
  }, [mnemonic.id, openSetPvVerifier])

  const handleDeleteClick = useCallback(() => {
    openDelete(mnemonic.id)
  }, [mnemonic.id, openDelete])

  const handleBackupClick = useCallback(() => {
    openBackup(mnemonic.id)
  }, [mnemonic.id, openBackup])

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        className="bg-grey-850 hover:bg-grey-800 hover:text-body text-body-secondary flex h-[6.5rem] w-full items-center gap-6 rounded-sm px-8 text-left"
      >
        <div className="bg-body-secondary/10 flex h-[4rem] w-[4rem] shrink-0 items-center justify-center rounded-full">
          <SeedIcon className="text-body-secondary text-lg" />
        </div>
        <div className="flex grow flex-col gap-2 overflow-hidden">
          <div className="text-body truncate text-base">{mnemonic.name}</div>
          <div className="text-body-secondary flex items-center gap-2 text-xs leading-none">
            <AccountsStack accounts={accounts} />
            <div>{t("used by {{count}} accounts", { count: accounts.length })}</div>
          </div>
        </div>

        {/* reserved space for the context menu button */}
        <div style={actionsStyle} className="h-[3.6rem] w-[3.6rem] shrink-0"></div>
        <AccordionIcon isOpen={isOpen} className="text-lg" />
      </button>
      <div
        ref={refActions}
        className="absolute right-24 top-0 flex h-[6.5rem] flex-col justify-center"
      >
        <div className="relative flex items-center gap-6">
          {!mnemonic.confirmed && (
            <button
              ref={refBackup}
              onClick={handleBackupClick}
              className="bg-grey-850 hover:bg-grey-800 text-alert-warn flex h-[3rem] items-center gap-[0.5em] rounded-[2rem] border px-6 text-sm"
            >
              <span>{t("Backup")}</span>
              <AlertCircleIcon className="inline-block text-base" />
            </button>
          )}
          <ContextMenu>
            <ContextMenuTrigger className="bg-grey-850 hover:bg-grey-800 hover:text-body text-body-secondary  rounded p-2">
              <MoreHorizontalIcon className="text-lg" />
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={handleRenameClick}>{t("Rename")}</ContextMenuItem>
              <ContextMenuItem
                onClick={handleBackupClick}
                disabled={isBackupConfirmed(mnemonic.id)}
              >
                <div className="flex items-center gap-[0.8rem]">
                  <span>{t("Backup")} </span>
                  <AlertCircleIcon className="text-alert-warn inline-block text-base" />
                </div>
              </ContextMenuItem>
              <ContextMenuItem onClick={handleSetVerifierClick} disabled={isVerifier(mnemonic.id)}>
                {t("Set as Polkadot Vault Verifier Certificate")}
              </ContextMenuItem>
              <ContextMenuItem onClick={handleDeleteClick} disabled={!canDelete(mnemonic.id)}>
                {t("Delete")}
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        </div>
      </div>
      <Accordion isOpen={isOpen}>
        <div className="relative pl-[6rem]">
          {!accounts.length && (
            <div className="text-body-secondary bg-grey-900 mt-4 flex h-[4.8rem] items-center gap-6 rounded-sm px-8">
              <InfoIcon className="text-md" />{" "}
              {t("There are no accounts derived from this recovery phrase")}
            </div>
          )}
          {accounts.map((account) => (
            <AccountRow key={account.address} account={account} />
          ))}
          <CornerDownRightIcon className="text-body-disabled absolute left-12 top-6 text-lg" />
        </div>
      </Accordion>
    </div>
  )
}

const BackupReminder: FC = () => {
  const { t } = useTranslation("admin")
  const mnemonics = useMnemonics()
  const { snoozeBackupReminder, isSnoozed } = useMnemonicBackup()

  const count = useMemo(
    () => mnemonics.filter((mnemonic) => !mnemonic.confirmed).length,
    [mnemonics]
  )

  if (!count || isSnoozed) return null

  return (
    <div
      className={classNames(
        "border-body-secondary mb-8 flex w-full items-center gap-4 rounded-sm border p-4",
        isSnoozed && "invisible"
      )}
    >
      <div className="bg-primary/10 rounded-full p-3">
        <AlertCircleIcon className="text-primary-500 text-sm" />
      </div>
      <div className="grow text-sm">
        {t("{{count}} recovery phrase(s) have not been backed up yet.", { count })}
      </div>
      <IconButton className="p-2 text-base" onClick={snoozeBackupReminder}>
        <XIcon />
      </IconButton>
    </div>
  )
}

export const MnemonicsPage = () => {
  const { t } = useTranslation("admin")
  const mnemonics = useMnemonics()

  return (
    <DashboardLayout centered withBack backTo="/settings">
      <MnemonicRenameModalProvider>
        <MnemonicDeleteModalProvider>
          <MnemonicSetPvVerifierModalProvider>
            <MnemonicBackupModalProvider>
              <HeaderBlock
                title={t("Recovery Phrases")}
                text={t("Manage and backup your recovery phrases")}
              />
              <Spacer large />
              <BackupReminder />
              <div className="">
                {mnemonics.map((mnemonic) => (
                  <MnemonicRow key={mnemonic.id} mnemonic={mnemonic} />
                ))}
              </div>
              <MnemonicBackupModal />
              <MnemonicSetPvVerifierModal />
              <MnemonicDeleteModal />
              <MnemonicRenameModal />
            </MnemonicBackupModalProvider>
          </MnemonicSetPvVerifierModalProvider>
        </MnemonicDeleteModalProvider>
      </MnemonicRenameModalProvider>
    </DashboardLayout>
  )
}
