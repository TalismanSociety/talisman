import { type AccountOfType, getAccountGenesisHash, isAccountOfType, type Mnemonic } from "@core"
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
import { DashboardLayout } from "@ui/apps/dashboard/layout"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { AccountsStack } from "@ui/domains/Account/AccountIconsStack"
import { Address } from "@ui/domains/Account/Address"
import { useAccounts, useAppState, useMnemonics } from "@ui/state"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@ui/talisman-ui/components/ContextMenu"
import { type FC, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useNavigate, useSearchParams } from "react-router-dom"

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
  const { t } = useTranslation()
  const navigate = useNavigate()

  const handleAddAccountClick = useCallback(() => {
    navigate("/accounts/add")
  }, [navigate])

  return (
    <div className="flex items-center gap-6 rounded bg-grey-800 p-6 text-base text-body-secondary">
      <InfoIcon className="shrink-0 text-lg" />
      <div>
        <Trans
          t={t}
          components={{
            Link: (
              <button
                type="button"
                onClick={handleAddAccountClick}
                className="inline text-grey-300 hover:text-grey-200"
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
        .filter((acc) => isAccountOfType(acc, "keypair"))
        .filter((account) => account.mnemonicId === mnemonicId)
        .sort((a1, a2) => (a1.derivationPath ?? "")?.localeCompare(a2.derivationPath ?? "")),
    [accounts, mnemonicId]
  )
}

const AccountRow: FC<{ account: AccountOfType<"keypair"> }> = ({ account }) => (
  <div className="mt-4 flex h-[4.8rem] w-full items-center gap-6 overflow-hidden rounded-sm bg-grey-900 px-8 text-body-secondary">
    <AccountIcon
      className="text-lg"
      address={account.address}
      genesisHash={getAccountGenesisHash(account)}
    />
    <div className="flex grow flex-col gap-1 overflow-hidden">
      <div className="max-w-full truncate text-body text-sm">{account.name}</div>
      <div className="text-body-secondary text-xs">
        <Address address={account.address} startCharCount={6} endCharCount={6} />
      </div>
    </div>
    <div className="flex flex-col font-mono text-body-secondary text-xs">
      {account.derivationPath}
    </div>
  </div>
)

const MnemonicRow: FC<{ mnemonic: Mnemonic }> = ({ mnemonic }) => {
  const { t } = useTranslation()
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
          "flex h-[6.5rem] w-full items-center gap-6 rounded-sm px-8 text-left text-body-secondary hover:text-body",
          mnemonic.confirmed
            ? "bg-grey-850 hover:bg-grey-800"
            : "bg-alert-warn/5 hover:bg-alert-warn/10"
        )}
      >
        <div className="flex h-[4rem] w-[4rem] shrink-0 items-center justify-center rounded-full bg-body-secondary/10">
          <SecretIcon className="text-body-secondary text-lg" />
        </div>
        <div className="flex grow flex-col gap-2 overflow-hidden">
          <div className="flex items-center gap-2">
            <div className="truncate text-base text-body">{mnemonic.name}</div>
            {isVerifier(mnemonic.id) && <PolkadotVaultIcon className="shrink-0 text-primary" />}
          </div>
          <div className="flex items-center gap-2 text-body-secondary text-xs leading-none">
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
        className="absolute top-0 right-24 flex h-[6.5rem] flex-col justify-center"
      >
        <div className="relative flex items-center gap-6">
          {!mnemonic.confirmed && (
            <button
              type="button"
              ref={refBackup}
              onClick={handleBackupClick}
              className="flex h-[3rem] items-center gap-[0.5em] rounded-[2rem] border bg-alert-warn/5 px-6 text-alert-warn text-sm hover:bg-alert-warn/10"
            >
              <span>{t("Backup")}</span>
              <AlertCircleIcon className="inline-block text-base" />
            </button>
          )}
          <ContextMenu placement="bottom-end">
            <ContextMenuTrigger className="rounded p-2 text-body-secondary hover:bg-grey-800 hover:text-body active:hover:bg-grey-800">
              <MoreHorizontalIcon className="text-lg" />
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={handleRenameClick}>{t("Rename")}</ContextMenuItem>
              <ContextMenuItem onClick={handleBackupClick}>
                <div className="flex items-center gap-[0.8rem]">
                  <span>{t("Backup")}</span>
                  {!mnemonic.confirmed && (
                    <AlertCircleIcon className="inline-block text-alert-warn text-base" />
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
            <div className="mt-4 flex h-[4.8rem] items-center gap-6 rounded-sm bg-grey-900 px-8 text-body-secondary text-sm">
              <InfoIcon className="text-md" />{" "}
              {t("There are no accounts derived from this recovery phrase")}
            </div>
          )}
          {accounts.map((account) => (
            <AccountRow key={account.address} account={account} />
          ))}
          <CornerDownRightIcon className="absolute top-6 left-12 text-body-disabled text-lg" />
        </div>
      </Accordion>
    </div>
  )
}

const BackupReminder: FC = () => {
  const { t } = useTranslation()
  const mnemonics = useMnemonics()

  const count = useMemo(
    () => mnemonics.filter((mnemonic) => !mnemonic.confirmed).length,
    [mnemonics]
  )

  if (!count) return null

  return (
    <div
      className={classNames(
        "mb-8 flex w-full items-center gap-4 rounded-sm border border-grey-500 p-4"
      )}
    >
      <div className="rounded-full bg-primary/10 p-3">
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

const Content = () => {
  const { t } = useTranslation()

  return (
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
  )
}

export const MnemonicsPage = () => (
  <DashboardLayout sidebar="settings">
    <Content />
  </DashboardLayout>
)
