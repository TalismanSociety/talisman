import { IS_FIREFOX } from "@core/constants"
import { getIsLedgerCapable } from "@core/util/getIsLedgerCapable"
import { EthereumCircleLogo, PolkadotCircleLogo } from "@talisman/theme/logos"
import { ChainIcon, EyePlusIcon, FilePlusIcon, PlusIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { ReactNode, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { MethodTypes, useAccountCreateContext } from "./context"

type Props = {
  className?: string
}

const SelectedIndicator = () => (
  <svg
    width="18"
    height="16"
    viewBox="0 0 18 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="relative right-8 top-12 float-right"
  >
    <ellipse cx="9.26364" cy="8" rx="8.45841" ry="8" fill="#5A5A5A" />
    <ellipse cx="9.26363" cy="8" rx="4.2292" ry="4" fill="#D5FF5C" />
  </svg>
)

const AccountCreateMethodTypeButton = ({
  title,
  subtitle,
  icon,
  methodType,
  testId,
}: {
  title: string
  subtitle: string
  icon: ReactNode
  methodType: MethodTypes
  testId?: string
}) => {
  const { methodType: selectedMethodType, setMethodType } = useAccountCreateContext()
  const isSelected = selectedMethodType === methodType
  return (
    <div
      tabIndex={["new", "import", "connect"].indexOf(methodType) + 1}
      role="button"
      data-testid={testId}
      className={classNames(
        isSelected
          ? `border-grey-50 bg-opacity-5`
          : `border-black-secondary  hover:bg-grey-800 hover:text-grey-300 focus:bg-grey-800 focus:text-grey-300 border-opacity-10 bg-opacity-[0.15]`,
        "bg-black-secondary h-[13.8rem] cursor-pointer rounded border-2 "
      )}
      onClick={() => setMethodType(methodType)}
      onKeyUp={(e) => {
        if (e.key === "Enter") setMethodType(methodType)
      }}
    >
      {isSelected && <SelectedIndicator />}
      <div className="flex flex-col items-start gap-8 px-8 py-12">
        <span className={`text-primary-500 text-xl ${!isSelected && "opacity-50"}`}>{icon}</span>
        <div className="flex flex-col gap-2">
          <span className="text-body text-[1.8rem]">{title}</span>
          <span className="text-xs">{subtitle}</span>
        </div>
      </div>
    </div>
  )
}

const networkChoices = {
  polkadot: <PolkadotCircleLogo />,
  ethereum: <EthereumCircleLogo />,
}

const AccountCreateMethodButton = ({
  title,
  subtitle,
  networks,
  disabled,
  to,
  testId,
}: {
  title: string
  subtitle: string
  networks: Array<"ethereum" | "polkadot">
  disabled?: boolean
  to?: string
  testId?: string
}) => {
  const navigate = useNavigate()
  const handleClick = useCallback(() => {
    if (to) navigate(to)
  }, [navigate, to])

  return (
    <button
      type="button"
      data-testid={testId}
      disabled={disabled}
      onClick={handleClick}
      className={`flex flex-col gap-2 rounded bg-white bg-opacity-[0.02] p-6 ${
        disabled
          ? "text-body-secondary"
          : "text-body cursor-pointer hover:bg-opacity-10 focus:bg-opacity-10"
      }`}
    >
      <span className={"flex justify-start"}>{title}</span>
      <span className={"text-body-secondary flex items-center gap-2 text-sm"}>
        {networks.map((network, i) => (
          <span key={network} className={i + 1 < networks.length ? "-mr-[0.8rem]" : ""}>
            {networkChoices[network]}
          </span>
        ))}
        <span className="text-xs">{subtitle}</span>
      </span>
    </button>
  )
}

const NewAccountMethodButtons = () => {
  const { t } = useTranslation("admin")
  return (
    <>
      <AccountCreateMethodButton
        testId="new-polkadot-account-btn"
        title={t("New Polkadot Account")}
        subtitle={t("Create new Polkadot account")}
        networks={["polkadot"]}
        to={`/accounts/add/derived?type=sr25519`}
      />
      <AccountCreateMethodButton
        testId="new-ethereum-account-btn"
        title={t("New Ethereum Account")}
        subtitle={t("Create new Ethereum account")}
        networks={["ethereum"]}
        to={`/accounts/add/derived?type=ethereum`}
      />
    </>
  )
}

const ImportAccountMethodButtons = () => {
  const { t } = useTranslation("admin")
  return (
    <>
      <AccountCreateMethodButton
        title={t("Import via JSON")}
        subtitle={t("Import your Polkadot.{js} file")}
        networks={["polkadot"]}
        to={`/accounts/add/json`}
      />
      <AccountCreateMethodButton
        title={t("Import via Recovery Phrase")}
        subtitle={t("Polkadot or Ethereum account")}
        networks={["polkadot", "ethereum"]}
        to={`/accounts/add/secret`}
      />
    </>
  )
}

const ConnectAccountMethodButtons = () => {
  const isLedgerCapable = getIsLedgerCapable()
  const { t } = useTranslation("admin")
  return (
    <>
      <AccountCreateMethodButton
        title={t("Connect Ledger")}
        subtitle={
          isLedgerCapable ? t("Polkadot or Ethereum account") : t("Not supported on this browser")
        }
        networks={isLedgerCapable ? ["polkadot", "ethereum"] : []}
        disabled={!isLedgerCapable}
        to={`/accounts/add/ledger`}
      />
      <AccountCreateMethodButton
        title={t("Connect Polkadot Vault")}
        subtitle={t("Or Parity Signer (Legacy)")}
        networks={["polkadot"]}
        to={`/accounts/add/qr`}
      />
      <AccountCreateMethodButton
        title={t("Connect D'CENT")}
        subtitle={
          !IS_FIREFOX
            ? t("Connect your D'CENT Biometric Wallet")
            : t("Not supported on this browser")
        }
        disabled={IS_FIREFOX}
        networks={["polkadot", "ethereum"]}
        to={`/accounts/add/dcent`}
      />
    </>
  )
}

const AddWatchedAccountButton = () => {
  const { t } = useTranslation("admin")
  const navigate = useNavigate()
  const handleClick = useCallback(() => {
    navigate("/accounts/add/watched")
  }, [navigate])

  return (
    <div
      tabIndex={-4}
      role="button"
      onClick={() => handleClick()}
      onKeyUp={(e) => {
        if (e.key === "Enter") handleClick()
      }}
      className="hover:text-grey-300 focus:text-grey-300 flex cursor-pointer flex-col items-center justify-center gap-4 rounded p-4 hover:bg-white hover:bg-opacity-10 focus:bg-white focus:bg-opacity-10"
    >
      <div className="text-body flex items-center gap-4 font-bold">
        <EyePlusIcon />
        <span>{t("Add Watched Account")}</span>
      </div>
      <div className="flex items-center justify-end text-lg">
        {/* flex gap doesn't allow negatives */}
        <PolkadotCircleLogo className="-mr-[0.6rem]" />
        <EthereumCircleLogo />
      </div>
    </div>
  )
}

export const AccountCreateContainer = ({ className }: Props) => {
  const { t } = useTranslation("admin")
  const { methodType } = useAccountCreateContext()

  const MethodButtonsComponent = useMemo(() => {
    switch (methodType) {
      case "new":
        return NewAccountMethodButtons
      case "import":
        return ImportAccountMethodButtons
      case "connect":
        return ConnectAccountMethodButtons

      default:
        return null
    }
  }, [methodType])

  return (
    <div className={classNames(className, "justify-left flex flex-col gap-8")}>
      <div className="flex flex-col justify-center gap-24">
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-3 gap-8">
            <AccountCreateMethodTypeButton
              title={t("New")}
              subtitle={t("Create a new account")}
              icon={<PlusIcon />}
              methodType="new"
              testId="new-account-btn"
            />
            <AccountCreateMethodTypeButton
              title={t("Import")}
              subtitle={t("Import an existing account")}
              icon={<FilePlusIcon />}
              methodType="import"
            />
            <AccountCreateMethodTypeButton
              title={t("Connect")}
              subtitle={t("Ledger, Polkadot Vault, etc")}
              icon={<ChainIcon />}
              methodType="connect"
            />
          </div>
          <div className="grid h-[14rem] grid-cols-2 items-start gap-8">
            {MethodButtonsComponent && <MethodButtonsComponent />}
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-4 self-stretch">
          <div className="flex items-center gap-8 self-stretch">
            <span className="bg-grey-700 h-[0.08rem] w-full"></span>
            <span className="text-grey-500 w-full flex-auto whitespace-nowrap text-xs">
              {t("Don't want to import your private key?")}
            </span>
            <span className="bg-grey-700 h-[0.08rem] w-full"></span>
          </div>

          <AddWatchedAccountButton />
        </div>
      </div>
    </div>
  )
}
