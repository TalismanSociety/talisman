import imgNoAccounts from "@talisman/theme/images/no-accounts-character.png"
import { EyePlusIcon, PlusIcon } from "@talismn/icons"
import { Trans, useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

type NoAccountsProps = {
  handleAddAccountClick: () => void
  handleWatchAccountClick: () => void
}

export const NoAccounts = ({ handleAddAccountClick, handleWatchAccountClick }: NoAccountsProps) => {
  const { t } = useTranslation()

  return (
    <div
      className="flex flex-col items-center justify-center gap-8 px-8 text-center md:w-1/2 md:gap-12 md:p-12"
      data-testid="no-accounts-banner"
    >
      <div className="flex flex-col items-center gap-4 md:gap-12">
        <span className="md:text-lg">{t("Talisman awaits!")}</span>
        <img
          className="h-[12.4rem] w-[15rem] md:h-[21.4rem] md:w-[26rem]"
          src={imgNoAccounts}
          alt="Heroic Character"
        />
        <div className="text-body-secondary md:text-md text-sm">
          <Trans t={t}>
            <span className="text-body">Add an account</span> or{" "}
            <span className="text-body">watch</span> those who are already walking the paths of the
            Paraverse.
          </Trans>
        </div>
      </div>
      <div className="md:text-md flex w-[28rem] flex-col items-center gap-8 text-sm">
        <Button
          primary
          iconLeft={PlusIcon}
          onClick={handleAddAccountClick}
          className="md:text-md h-20 px-12 py-5 text-sm md:h-28 md:w-full md:px-12"
        >
          {t("Add account")}
        </Button>
        <button
          className="hover:text-body-secondary text-body flex items-center gap-4"
          onClick={handleWatchAccountClick}
        >
          <EyePlusIcon />
          <span>{t("Watch account")}</span>
        </button>
      </div>
    </div>
  )
}
