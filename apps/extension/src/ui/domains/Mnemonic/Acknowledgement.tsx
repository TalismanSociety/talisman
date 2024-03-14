import { MNEMONIC_BACKUP_DOCS_URL } from "@extension/shared"
import { LockIcon, ShieldIcon, XIcon } from "@talismn/icons"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

export const Acknowledgement = ({ onContinueClick }: { onContinueClick: () => void }) => {
  const { t } = useTranslation("admin")

  return (
    <div>
      <div className="mb-4 flex flex-col gap-16">
        <div className="flex flex-col gap-12">
          <div className="flex items-center gap-6">
            <span className="text-brand-pink flex h-20 items-center rounded-2xl bg-[#FD8FFF1A] p-6">
              <LockIcon className="h-10 w-10" />
            </span>
            <span>
              {t(
                "Protect your recovery phrase. Anyone who has it can access your wallet and funds."
              )}
            </span>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-primary-700 flex h-20 items-center rounded-2xl bg-[#D5FF5C1A] p-6">
              <ShieldIcon className="h-10 w-10" />
            </span>
            <span>{t("Write down your recovery phrase and store it in a secure location.")}</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="flex h-20 items-center rounded-2xl bg-[#FD48481A] p-6 text-red-500">
              <XIcon className="h-10 w-10" />
            </span>
            <span>
              {t("If you lose your recovery phrase, you will lose access to your funds.")}
            </span>
          </div>
        </div>
        <Button primary onClick={onContinueClick}>
          {t("Acknowledge and Continue")}
        </Button>
      </div>
      <div className="text-center">
        <a
          href={MNEMONIC_BACKUP_DOCS_URL}
          target="_blank"
          className="text-body-secondary hover:text-grey-300 text-sm"
        >
          {t("Learn More")}
        </a>
      </div>
    </div>
  )
}
