import imgNoAccounts from "@talisman/theme/images/no-accounts-character.png"
import { ChevronRightIcon, DepositIcon, PlusIcon, TryItIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { MouseEventHandler, ReactNode } from "react"
import { Trans, useTranslation } from "react-i18next"

type NoAccountsProps = {
  className?: string
  hasSomeAccounts?: boolean
  onAddAccount: () => void
  onWatchAccount: () => void
  onDeposit: () => void
}

export const NoAccounts = ({
  className,
  hasSomeAccounts,
  onAddAccount,
  onWatchAccount,
  onDeposit,
}: NoAccountsProps) => {
  const { t } = useTranslation()

  return (
    <div
      className={classNames(
        "bg-grey-850 mx-auto flex flex-col items-center gap-8 rounded-sm p-8",
        !hasSomeAccounts && "mt-16 pt-0",
        hasSomeAccounts && "bg-gradient-to-br from-[#111] to-[#005773] to-[400%]",
        className
      )}
    >
      <header
        className={classNames(
          "flex w-full flex-col items-center gap-4",
          hasSomeAccounts && "items-start"
        )}
      >
        {!hasSomeAccounts && (
          <img className="-mt-16 w-[16rem] max-w-full" src={imgNoAccounts} alt="Heroic Character" />
        )}
        <span className="text-md font-bold">{t("Get Started")}</span>
        <span className="text-xs">
          <Trans t={t}>
            Your launchpad to the{" "}
            <span className="text-primary font-bold">multi-chain universe</span>
          </Trans>
        </span>
      </header>

      <div className="flex gap-8">
        {hasSomeAccounts ? (
          <GetStartedButton className="flex flex-1 flex-col gap-4" onClick={onDeposit}>
            <DepositIcon className="text-lg" />
            <div className="text-base font-bold text-white">{t("Deposit")}</div>
            <div className="text-tiny text-body-secondary">
              {t("Add funds to begin your Talisman journey")}
            </div>
          </GetStartedButton>
        ) : (
          <GetStartedButton className="flex flex-1 flex-col gap-4" onClick={onAddAccount}>
            <PlusIcon className="text-primary text-lg" />
            <div className="text-base font-bold text-white">{t("Add account")}</div>
            <div className="text-tiny text-body-secondary">
              {t("Create or import an existing account")}
            </div>
          </GetStartedButton>
        )}

        <GetStartedButton className="flex flex-1 flex-col gap-4" onClick={onWatchAccount}>
          <TryItIcon className="text-lg text-[#ff6c4b]" />
          <div className="text-base font-bold text-white">{t("Try it")}</div>
          <div className="text-tiny text-body-secondary">
            {t("Follow an account without importing a seed")}
          </div>
        </GetStartedButton>
      </div>

      <GetStartedButton className="flex w-full items-center justify-between gap-4 p-8 pr-4">
        <div className="flex flex-col gap-4">
          <div className="text-base font-bold text-white">{t("Learn More")}</div>
          <div className="text-tiny text-body-secondary">
            {t("Discover how Talisman can elevate your web3 journey")}
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
  children?: ReactNode
}) => (
  <button
    className={classNames(
      "rounded border border-[#322D2D] bg-[rgba(255,255,255,0.02)] px-8 py-4 text-left hover:border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.04)] focus:border-[rgba(255,255,255,0.04)] focus:bg-[rgba(255,255,255,0.04)]",
      className
    )}
    type="button"
    onClick={onClick}
  >
    {children}
  </button>
)
