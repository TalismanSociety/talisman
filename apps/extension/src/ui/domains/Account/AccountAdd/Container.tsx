import { AccountPlatform } from "@talismn/crypto"
import { ChainIcon, EyePlusIcon, FilePlusIcon, InfoIcon, PlusIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { isAccountPlatformCompatibleWithNetwork } from "extension-core"
import { IS_FIREFOX } from "extension-shared"
import { cloneElement, ReactElement, ReactNode, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import {
  EthereumCircleBorderedLogo,
  PolkadotCircleBorderedLogo,
  SolanaCircleLogo,
} from "@talisman/theme/logos"
import { AccountTypeNetworkSearch } from "@ui/domains/Account/AccountTypeNetworkSearch"
import { AllNetworksLogoStack } from "@ui/domains/Account/AllNetworksLogoStack"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { useNetworks } from "@ui/state"
import { getIsLedgerCapable } from "@ui/util/getIsLedgerCapable"

import { MethodType, useAccountCreateContext } from "./context"

const methodButtonsFromMethodType = {
  new: NewAccountMethodButtons,
  import: ImportAccountMethodButtons,
  connect: ConnectAccountMethodButtons,
  watched: WatchedAccountMethodButtons,
}

export const AccountCreateContainer = ({ className }: { className?: string }) => {
  const { t } = useTranslation()
  const { methodType } = useAccountCreateContext()
  const MethodButtonsComponent = methodButtonsFromMethodType[methodType] ?? null

  return (
    <div className={classNames("justify-left flex flex-col gap-8", className)}>
      <div className="flex overflow-auto">
        <MethodTypeTab
          icon={<PlusIcon />}
          title={t("New")}
          subtitle={t("Create a new account")}
          methodType="new"
        />
        <MethodTypeTab
          icon={<FilePlusIcon />}
          title={t("Import")}
          subtitle={t("Import an existing account")}
          methodType="import"
        />
        <MethodTypeTab
          icon={<ChainIcon />}
          title={t("Connect")}
          subtitle={t("Ledger, Polkadot Vault, etc")}
          methodType="connect"
        />
        <MethodTypeTab
          icon={<EyePlusIcon />}
          title={t("Watch")}
          subtitle={t("Add a watched account")}
          methodType="watched"
        />
      </div>
      <div className="border-grey-750 -mt-8 grid grid-cols-2 items-start gap-8 rounded rounded-tl-none border p-10">
        <MethodButtonsComponent />
      </div>
    </div>
  )
}

function MethodTypeTab({
  className,
  icon,
  title,
  subtitle,
  methodType,
}: {
  className?: string
  icon: ReactElement
  title: ReactNode
  subtitle: ReactNode
  methodType: MethodType
}) {
  const { methodType: selectedMethodType, setMethodType } = useAccountCreateContext()
  const isSelected = selectedMethodType === methodType

  return (
    <button
      type="button"
      className={classNames(
        "flex items-center justify-start gap-4 rounded-t border border-b-0 border-transparent p-6 opacity-70 lg:flex-grow lg:[&:last-of-type]:rounded-br",
        "focus:bg-grey-750 hover:bg-grey-750 focus:border-grey-750 hover:border-grey-750 hover:opacity-100 focus:opacity-100",
        isSelected && "border-grey-750 bg-grey-850 opacity-100",
        className,
      )}
      onClick={(e) => (setMethodType(methodType), e.currentTarget.blur())}
    >
      <div className="text-primary text-lg">{cloneElement(icon, { className: "stroke-1" })}</div>
      <div
        className={classNames(
          "hidden flex-col items-start justify-start gap-2 lg:flex",
          isSelected && "flex",
        )}
      >
        <div className="text-base font-bold">{title}</div>
        <div className="text-body-secondary whitespace-pre text-xs">{subtitle}</div>
      </div>
    </button>
  )
}

function NewAccountMethodButtons() {
  const { t } = useTranslation()
  const [platform, setPlatform] = useState<AccountPlatform>()

  return (
    <>
      <SelectAccountTypeSectionHeader />
      <AccountTypeNetworkSearch setAccountPlatform={setPlatform} />
      <AccountTypeMethodButton
        disabled={platform === "polkadot"}
        title={
          <SelectAccountTypeButtonHeader
            title={t("New Ethereum Account")}
            tooltip={t(
              "Pick this option for Ethereum, Base, zkSync, Arbitrum, BSC, and all EVM chains.",
            )}
          />
        }
        platform="ethereum"
        to={`/accounts/add/derived?platform=ethereum`}
      />
      <AccountTypeMethodButton
        disabled={platform === "ethereum"}
        title={
          <SelectAccountTypeButtonHeader
            title={t("New Polkadot Account")}
            tooltip={t(
              "Pick this option for Polkadot Relay Chain, Asset Hub, Bittensor, and most Polkadot chains.",
            )}
          />
        }
        platform="polkadot"
        to={`/accounts/add/derived?platform=polkadot`}
      />
      <AccountTypeMethodButton
        disabled={!!platform && platform !== "solana"}
        title={<SelectAccountTypeButtonHeader title={t("New Solana Account")} />}
        platform="solana"
        supportedNetworks={
          <div className="flex items-center gap-2">
            <NetworkLogo networkId="solana-mainnet" className="text-md" />
            <div>{t("Solana Mainnet and testnets")}</div>
          </div>
        }
        to={`/accounts/add/derived?platform=solana`}
      />
    </>
  )
}

function ImportAccountMethodButtons() {
  const { t } = useTranslation()

  return (
    <>
      <AccountCreateMethodButton
        title={t("Import via Recovery Phrase")}
        subtitle={t("Ethereum, Polkadot, and Solana accounts")}
        networks={["ethereum", "polkadot", "solana"]}
        to={`/accounts/add/mnemonic`}
      />
      <AccountCreateMethodButton
        title={t("Import via Private Key")}
        subtitle={t("Ethereum and Solana accounts")}
        networks={["ethereum", "solana"]}
        to={`/accounts/add/pk`}
      />
      <AccountCreateMethodButton
        title={t("Import via JSON")}
        subtitle={t("Import your Polkadot.{js} file")}
        networks={["polkadot"]}
        to={`/accounts/add/json`}
      />
    </>
  )
}

function ConnectAccountMethodButtons() {
  const { t } = useTranslation()
  const isLedgerCapable = getIsLedgerCapable()

  return (
    <>
      <AccountCreateMethodButton
        title={t("Connect Ledger")}
        subtitle={
          isLedgerCapable
            ? t("Ethereum, Polkadot or Ethereum accounts")
            : t("Not supported on this browser")
        }
        networks={isLedgerCapable ? ["ethereum", "polkadot", "solana"] : []}
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
        title={t("Connect Signet")}
        subtitle={!IS_FIREFOX ? t("Connect your Signet Vault") : t("Not supported on this browser")}
        networks={!IS_FIREFOX ? ["polkadot"] : []}
        disabled={IS_FIREFOX}
        to={`/accounts/add/signet`}
      />
    </>
  )
}

function WatchedAccountMethodButtons() {
  const { t } = useTranslation()
  const [platform, setPlatform] = useState<AccountPlatform>()

  return (
    <>
      <SelectAccountTypeSectionHeader />
      <AccountTypeNetworkSearch setAccountPlatform={setPlatform} />
      <AccountTypeMethodButton
        disabled={!!platform && platform !== "ethereum"}
        title={
          <SelectAccountTypeButtonHeader
            title={t("Watch Ethereum Account")}
            tooltip={t(
              "Pick this option for Ethereum, Base, zkSync, Arbitrum, BSC, and all EVM chains.",
            )}
          />
        }
        platform="ethereum"
        to={`/accounts/add/watched?platform=ethereum`}
      />
      <AccountTypeMethodButton
        disabled={!!platform && platform !== "polkadot"}
        title={
          <SelectAccountTypeButtonHeader
            title={t("Watch Polkadot Account")}
            tooltip={t(
              "Pick this option for Polkadot Relay Chain, Asset Hub, Bittensor, and most Polkadot chains.",
            )}
          />
        }
        platform="polkadot"
        to={`/accounts/add/watched?platform=polkadot`}
      />
      <AccountTypeMethodButton
        disabled={!!platform && platform !== "solana"}
        title={<SelectAccountTypeButtonHeader title={t("Watch Solana Account")} />}
        platform="solana"
        supportedNetworks={
          <div className="flex items-center gap-2">
            <NetworkLogo networkId="solana-mainnet" className="text-md" />
            <div>{t("Solana Mainnet and testnets")}</div>
          </div>
        }
        to={`/accounts/add/watched?platform=solana`}
      />
    </>
  )
}

function SelectAccountTypeSectionHeader() {
  const { t } = useTranslation()
  return (
    <>
      <div className="text-md text-bold col-span-2 text-white">{t("Select account type")}</div>
      <div className="col-span-2 -mt-2 text-sm text-white/40">
        {t(
          "If you don't know which to pick, search for the network you want to use and Talisman will recommend the account type.",
        )}
      </div>
    </>
  )
}

function SelectAccountTypeButtonHeader({ title, tooltip }: { title: string; tooltip?: string }) {
  return (
    <div className="flex items-center gap-3">
      {title}
      <Tooltip placement="bottom">
        <TooltipTrigger asChild>
          <div>
            <InfoIcon className="text-sm" />
          </div>
        </TooltipTrigger>
        {!!tooltip && (
          <TooltipContent>
            <div>{tooltip}</div>
          </TooltipContent>
        )}
      </Tooltip>
    </div>
  )
}

function AccountTypeMethodButton({
  title,
  platform,
  disabled,
  to,
  supportedNetworks,
}: {
  title: ReactNode
  platform: AccountPlatform
  disabled?: boolean
  to?: string
  supportedNetworks?: ReactNode
}) {
  const { t } = useTranslation()
  const networks = useNetworks()

  const supportedChainIds = useMemo(
    () =>
      networks.filter((n) => isAccountPlatformCompatibleWithNetwork(n, platform)).map((n) => n.id),
    [networks, platform],
  )

  return (
    <AccountCreateMethodButton
      title={title}
      subtitle={
        supportedNetworks ?? (
          <div className="flex items-center gap-2">
            <AllNetworksLogoStack className="text-md" ids={supportedChainIds} max={5} />
            <div>{t("Networks supported")}</div>
          </div>
        )
      }
      to={to}
      disabled={disabled}
    />
  )
}

const networkChoices = {
  polkadot: <PolkadotCircleBorderedLogo />,
  ethereum: <EthereumCircleBorderedLogo />,
  solana: <SolanaCircleLogo />,
}
function AccountCreateMethodButton({
  title,
  subtitle,
  networks,
  disabled,
  to,
}: {
  title: ReactNode
  subtitle: ReactNode
  networks?: Array<"ethereum" | "polkadot" | "solana">
  disabled?: boolean
  to?: string
}) {
  const navigate = useNavigate()
  const handleClick = useCallback(() => to !== undefined && navigate(to), [navigate, to])

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      className={classNames(
        "relative flex flex-col gap-12 rounded bg-white/5 p-10",
        disabled && "text-body-secondary opacity-40",
        !disabled && "text-body cursor-pointer hover:bg-white/10 focus:bg-white/10",
      )}
    >
      <span className="border-grey-800 w-full border-b pb-3 text-start">{title}</span>
      <span className="text-body-secondary flex items-center gap-2 pr-8 text-sm">
        {networks?.map((network, i) => (
          <span key={network} className={classNames(i + 1 < networks.length && "-mr-[0.8rem]")}>
            {networkChoices[network]}
          </span>
        ))}
        <span className="text-xs">{subtitle}</span>
      </span>
    </button>
  )
}
