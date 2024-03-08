import { AccountJsonAny } from "@extension/core"
import { Accordion, AccordionIcon } from "@talisman/components/Accordion"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Spacer } from "@talisman/components/Spacer"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import {
  AlertCircleIcon,
  CornerDownRightIcon,
  InfoIcon,
  MoreHorizontalIcon,
  PolkadotVaultIcon,
  SecretIcon,
} from "@talismn/icons"
import { classNames } from "@talismn/util"
import { DashboardLayout } from "@ui/apps/dashboard/layout/DashboardLayout"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { Address } from "@ui/domains/Account/Address"
import useAccounts from "@ui/hooks/useAccounts"
import { useAppState } from "@ui/hooks/useAppState"
import { Mnemonic, useMnemonics } from "@ui/hooks/useMnemonics"
import { FC, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useNavigate, useSearchParams } from "react-router-dom"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "talisman-ui"

import { AccountsStack } from "../Accounts/AccountIconsStack"
import { MnemonicBackupModalProvider, useMnemonicBackupModal } from "./MnemonicBackupModal"
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

const NoMnemonicMessage = () => {
  const { t } = useTranslation("admin")
  const navigate = useNavigate()

  const handleAddAccountClick = useCallback(() => {
    navigate("/accounts/add")
  }, [navigate])

  return (
    <div className="text-body-secondary bg-grey-800 flex items-center gap-6 rounded p-6 text-base">
      <InfoIcon className="shrink-0 text-lg" />
      <div>
        <Trans
          t={t}
          components={{
            Link: (
              <button
                type="button"
                onClick={handleAddAccountClick}
                className="hover:text-grey-200 text-grey-300 inline"
              ></button>
            ),
          }}
          defaults="Your recovery phrases will be displayed here after adding accounts. <Link>Add an account</Link>"
        />
      </div>
    </div>
  )
}

const useMnemonicAccounts = (mnemonicId: string) => {
  const accounts = useAccounts("owned")

  return useMemo(
    () =>
      accounts
        .filter((account) => account.derivedMnemonicId === mnemonicId)
        .sort((a1, a2) => (a1.derivationPath ?? "")?.localeCompare(a2.derivationPath ?? "")),
    [accounts, mnemonicId]
  )
}

const AccountRow: FC<{ account: AccountJsonAny }> = ({ account }) => (
  <div className="text-body-secondary bg-grey-900 mt-4 flex h-[4.8rem] w-full items-center gap-6 overflow-hidden rounded-sm px-8">
    <AccountIcon className="text-lg" address={account.address} genesisHash={account.genesisHash} />
    <div className="flex grow flex-col gap-1 overflow-hidden">
      <div className="text-body max-w-full truncate text-sm">{account.name}</div>
      <div className="text-body-secondary text-xs">
        <Address address={account.address} startCharCount={6} endCharCount={6} />
      </div>
    </div>
    <div className="text-body-secondary flex flex-col font-mono text-xs">
      {account.derivationPath}
    </div>
  </div>
)

const MnemonicRow: FC<{ mnemonic: Mnemonic }> = ({ mnemonic }) => {
  const { t } = useTranslation("admin")
  const { isOpen, toggle } = useOpenClose()
  const { open: openRename } = useMnemonicRenameModal()
  const { open: openSetPvVerifier, isVerifier } = useMnemonicSetPvVerifierModal()
  const { open: openDelete, canDelete } = useMnemonicDeleteModal()
  const { open: openBackup } = useMnemonicBackupModal()
  const refActions = useRef<HTMLDivElement>(null)
  const refBackup = useRef<HTMLButtonElement>(null)

  const hasVerifierCertificateMnemonic = Boolean(useAppState("vaultVerifierCertificateMnemonicId"))

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
        className={classNames(
          "  hover:text-body text-body-secondary flex h-[6.5rem] w-full items-center gap-6 rounded-sm px-8 text-left",
          mnemonic.confirmed
            ? "bg-grey-850 hover:bg-grey-800"
            : "bg-alert-warn/5 hover:bg-alert-warn/10"
        )}
      >
        <div className="bg-body-secondary/10 flex h-[4rem] w-[4rem] shrink-0 items-center justify-center rounded-full">
          <SecretIcon className="text-body-secondary text-lg" />
        </div>
        <div className="flex grow flex-col gap-2 overflow-hidden">
          <div className="flex items-center gap-2">
            <div className="text-body truncate text-base">{mnemonic.name}</div>
            {isVerifier(mnemonic.id) && <PolkadotVaultIcon className="text-primary shrink-0" />}
          </div>
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
              className="bg-alert-warn/5 hover:bg-alert-warn/10 text-alert-warn flex h-[3rem] items-center gap-[0.5em] rounded-[2rem] border px-6 text-sm"
            >
              <span>{t("Backup")}</span>
              <AlertCircleIcon className="inline-block text-base" />
            </button>
          )}
          <ContextMenu placement="bottom-end">
            <ContextMenuTrigger className=" hover:bg-grey-800 active:hover:bg-grey-800 hover:text-body text-body-secondary rounded p-2">
              <MoreHorizontalIcon className="text-lg" />
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={handleRenameClick}>{t("Rename")}</ContextMenuItem>
              <ContextMenuItem onClick={handleBackupClick}>
                <div className="flex items-center gap-[0.8rem]">
                  <span>{t("Backup")}</span>
                  {!mnemonic.confirmed && (
                    <AlertCircleIcon className="text-alert-warn inline-block text-base" />
                  )}
                </div>
              </ContextMenuItem>
              {hasVerifierCertificateMnemonic && (
                <ContextMenuItem
                  onClick={handleSetVerifierClick}
                  disabled={isVerifier(mnemonic.id)}
                >
                  {t("Set as Polkadot Vault Verifier Certificate")}
                </ContextMenuItem>
              )}
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
            <div className="text-body-secondary bg-grey-900 mt-4 flex h-[4.8rem] items-center gap-6 rounded-sm px-8 text-sm">
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

  const count = useMemo(
    () => mnemonics.filter((mnemonic) => !mnemonic.confirmed).length,
    [mnemonics]
  )

  if (!count) return null

  return (
    <div
      className={classNames(
        "border-grey-500 mb-8 flex w-full items-center gap-4 rounded-sm border p-4"
      )}
    >
      <div className="bg-primary/10 rounded-full p-3">
        <AlertCircleIcon className="text-primary-500 text-sm" />
      </div>
      <div className="grow text-sm">
        {t("{{count}} recovery phrase(s) have not been backed up yet.", { count })}
      </div>
    </div>
  )
}

const MnemonicsList = () => {
  const mnemonics = useMnemonics()

  const sortedMnemonics = useMemo(
    () => [...mnemonics].sort((m1, m2) => m1.name.localeCompare(m2.name)),
    [mnemonics]
  )

  const notBackedUp = useMemo(
    () => mnemonics.filter((mnemonic) => !mnemonic.confirmed),
    [mnemonics]
  )
  const { open: openBackup } = useMnemonicBackupModal()
  const [searchParams, updateSearchParams] = useSearchParams()

  useEffect(() => {
    const showBackupModal = searchParams.has("showBackupModal")
    if (showBackupModal) {
      searchParams.delete("showBackupModal")
      updateSearchParams(searchParams, { replace: true })
      if (notBackedUp.length === 1) {
        // open the backup modal for the only mnemonic that is not backed up
        openBackup(notBackedUp[0].id)
      }
    }
  }, [searchParams, notBackedUp, openBackup, updateSearchParams])

  if (!mnemonics.length) return <NoMnemonicMessage />

  return (
    <div className="flex flex-col gap-4">
      {sortedMnemonics.map((mnemonic) => (
        <MnemonicRow key={mnemonic.id} mnemonic={mnemonic} />
      ))}
    </div>
  )
}

export const MnemonicsPage = () => {
  const { t } = useTranslation("admin")

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
              <MnemonicsList />
              <MnemonicDeleteModal />
              <MnemonicRenameModal />
              <MnemonicSetPvVerifierModal />
            </MnemonicBackupModalProvider>
          </MnemonicSetPvVerifierModalProvider>
        </MnemonicDeleteModalProvider>
      </MnemonicRenameModalProvider>
    </DashboardLayout>
  )
}
