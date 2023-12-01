import imgNoAccounts from "@talisman/theme/images/no-accounts-character.png"
import { ChevronRightIcon, EyeIcon, PlusIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { MouseEventHandler, ReactNode } from "react"
import { Trans, useTranslation } from "react-i18next"

type NoAccountsProps = {
  handleAddAccountClick: () => void
  handleWatchAccountClick: () => void
}

export const NoAccounts = ({ handleAddAccountClick, handleWatchAccountClick }: NoAccountsProps) => {
  const { t } = useTranslation()

  return (
    <div className="bg-grey-850 mx-auto mt-16 flex flex-col items-center gap-8 rounded p-8 pt-0">
      <header className="flex flex-col items-center gap-4">
        <img className="-mt-16 w-[16rem] max-w-full" src={imgNoAccounts} alt="Heroic Character" />
        <span className="text-md font-bold">{t("Get Started")}</span>
        <span className="text-xs">
          <Trans t={t}>
            Your launchpad to the{" "}
            <span className="text-primary font-bold">multi-chain universe</span>
          </Trans>
        </span>
      </header>

      <div className="flex gap-8">
        <GetStartedButton className="flex flex-1 flex-col gap-4" onClick={handleAddAccountClick}>
          <PlusIcon className="text-primary text-lg" />
          <div className="text-base font-bold text-white">Add account</div>
          <div className="text-tiny text-body-secondary">Create or import an existing account</div>
        </GetStartedButton>

        <GetStartedButton className="flex flex-1 flex-col gap-4" onClick={handleWatchAccountClick}>
          <EyeIcon className="text-lg text-[#ff6c4b]" />
          <div className="text-base font-bold text-white">Try it</div>
          <div className="text-tiny text-body-secondary">
            Follow an account without importing a seed
          </div>
        </GetStartedButton>
      </div>

      <GetStartedButton className="flex w-full items-center justify-between gap-4 p-8 pr-4">
        <div className="flex flex-col gap-4">
          <div className="text-base font-bold text-white">Learn More</div>
          <div className="text-tiny text-body-secondary">
            Discover how Talisman can elevate your web3 journey
          </div>
        </div>
        <ChevronRightIcon className="text-primary text-lg" />
      </GetStartedButton>
    </div>
  )
}

const GetStartedButton = ({
  className,
  onClick,
  children,
}: {
  className?: string
  onClick?: MouseEventHandler<HTMLButtonElement>
  children: ReactNode
}) => (
  <button
    className={classNames(
      "rounded-lg border border-[#322D2D] bg-[rgba(255,255,255,0.02)] px-8 py-4 text-left hover:bg-[rgba(255,255,255,0.04)]",
      className
    )}
    type="button"
    onClick={onClick}
  >
    {children}
  </button>
)
