import { AccordionIcon } from "@talisman/components/Accordion"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Spacer } from "@talisman/components/Spacer"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { AlertCircleIcon, MoreHorizontalIcon, XIcon } from "@talisman/theme/icons"
import useAccounts from "@ui/hooks/useAccounts"
import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  IconButton,
} from "talisman-ui"

import { DashboardLayout } from "../../../layout/DashboardLayout"
import { Mnemonic, useMnemonics } from "./useMnemonics"

const useMnemonicAccounts = (mnemonicId: string) => {
  const accounts = useAccounts("owned")
  return accounts.filter((account) => account.mnemonicId === mnemonicId)
}

const MnemonicRow: FC<{ mnemonic: Mnemonic }> = ({ mnemonic }) => {
  const { t } = useTranslation("admin")
  const { isOpen, toggle } = useOpenClose()

  const accounts = useMnemonicAccounts(mnemonic.id)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        className="bg-grey-850 hover:bg-grey-800 hover:text-body text-body-secondary flex h-[6.5rem] w-full items-center gap-6 rounded-sm px-8 text-left"
      >
        <div className="flex grow flex-col gap-2 overflow-hidden truncate">
          <div className="text-body text-base">{mnemonic.name}</div>
          <div className="text-body-secondary text-xs">
            {t("used by {{count}} accounts", { count: accounts.length })}
          </div>
        </div>
        {/* reserved space for the context menu button */}
        <div className="w-18 shrink-0"></div>
        <AccordionIcon isOpen={isOpen} className="text-lg" />
      </button>
      <div className="absolute right-4 top-0 flex h-[6.5rem] flex-col justify-center">
        <ContextMenu>
          <ContextMenuTrigger className="bg-grey-850 hover:bg-grey-800 hover:text-body text-body-secondary absolute right-20 rounded p-3">
            <MoreHorizontalIcon className="text-lg" />
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem>{t("Rename")}</ContextMenuItem>
            <ContextMenuItem>{t("Backup")}</ContextMenuItem>
            <ContextMenuItem>{t("Set as Polkadot Vault Verifier")}</ContextMenuItem>
            <ContextMenuItem>{t("Delete")}</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </div>
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

  return (
    <div className="border-body-secondary mb-8 flex w-full items-center gap-4 rounded-sm border p-4">
      <div className="bg-primary/10 rounded-full p-3">
        <AlertCircleIcon className="text-primary-500 text-sm" />
      </div>
      <div className="grow text-sm">
        {t("{{count}} recovery phrase(s) have not been backed up yet.", { count })}
      </div>
      <IconButton className="p-2 text-base">
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
    </DashboardLayout>
  )
}
