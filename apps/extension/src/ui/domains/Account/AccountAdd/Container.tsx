import { IS_FIREFOX } from "@common/constants"
import { isAccountPlatformCompatibleWithNetwork } from "@core/domains/accounts/helpers"
import type { AccountPlatform } from "@talismn/crypto"
import { ChainIcon, EyePlusIcon, FilePlusIcon, InfoIcon, PlusIcon } from "@talismn/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { AccountTypeNetworkSearch } from "@ui/domains/Account/AccountTypeNetworkSearch"
import { AllNetworksLogoStack } from "@ui/domains/Account/AllNetworksLogoStack"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { useNetworks } from "@ui/state/chaindata"
import {
  BitcoinCircleBorderedLogo,
  BittensorCircleBorderedLogo,
  EthereumCircleBorderedLogo,
  PolkadotCircleBorderedLogo,
  SolanaCircleLogo,
} from "@ui/theme/logos"
import { cn } from "@ui/util/cn"
import { getIsLedgerCapable } from "@ui/util/getIsLedgerCapable"
import {
  cloneElement,
  type ReactElement,
  type ReactNode,
  useCallback,
  useMemo,
  useState,
} from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { type MethodType, useAccountCreateContext } from "./context"

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
    <div className={cn("justify-left flex flex-col gap-8", className)}>
      <div className="flex overflow-auto" data-testid="container-account-method">
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
      <div className="-mt-8 grid grid-cols-2 items-start gap-8 rounded rounded-tl-none border border-grey-750 p-10">
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
  icon: ReactElement<{ className?: string }>
  title: ReactNode
  subtitle: ReactNode
  methodType: MethodType
}) {
  const { methodType: selectedMethodType, setMethodType } = useAccountCreateContext()
  const isSelected = selectedMethodType === methodType

  return (
    <button
      type="button"
      className={cn(
        "flex items-center justify-start gap-4 rounded-t border border-transparent border-b-0 p-6 opacity-70 lg:grow lg:last-of-type:rounded-br",
        "hover:border-grey-750 hover:bg-grey-750 hover:opacity-100 focus:border-grey-750 focus:bg-grey-750 focus:opacity-100",
        isSelected && "border-grey-750 bg-grey-850 opacity-100",
        className
      )}
      // biome-ignore lint/complexity/noCommaOperator: legacy
      onClick={(e) => (setMethodType(methodType), e.currentTarget.blur())}
    >
      <div className="text-lg text-primary">{cloneElement(icon, { className: "stroke-1" })}</div>
      <div
        className={cn(
          "hidden flex-col items-start justify-start gap-2 lg:flex",
          isSelected && "flex"
        )}
      >
        <div className="font-bold text-base">{title}</div>
        <div className="whitespace-pre text-body-secondary text-xs">{subtitle}</div>
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
              "Pick this option for Ethereum, Base, zkSync, Arbitrum, BSC, and all EVM chains."
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
            title={t("New Substrate Account")}
            tooltip={t(
              "Pick this option for Polkadot Relay Chain, Asset Hub, Bittensor, and most Substrate chains."
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
      <AccountTypeMethodButton
        disabled={!!platform && platform !== "bitcoin"}
        title={<SelectAccountTypeButtonHeader title={t("New Bitcoin Account")} />}
        platform="bitcoin"
        supportedNetworks={
          <div className="flex items-center gap-2">
            <NetworkLogo networkId="bitcoin" className="text-md" />
            <div>{t("Bitcoin Mainnet and Signet")}</div>
          </div>
        }
        to={`/accounts/add/derived?platform=bitcoin`}
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
        subtitle={t("Ethereum, Substrate, Solana and Bitcoin accounts")}
        networks={["ethereum", "polkadot", "solana", "bittensor", "bitcoin"]}
        to={`/accounts/add/mnemonic`}
      />
      <AccountCreateMethodButton
        title={t("Import via Private Key")}
        subtitle={t("Ethereum, Solana and Bitcoin accounts")}
        networks={["ethereum", "solana", "bitcoin"]}
        to={`/accounts/add/pk`}
      />
      <AccountCreateMethodButton
        title={t("Import via JSON")}
        subtitle={t("Import your Polkadot.{js} file")}
        networks={["polkadot", "bittensor"]}
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
            ? t("Ethereum, Substrate, Solana or Bitcoin accounts")
            : t("Not supported on this browser")
        }
        networks={isLedgerCapable ? ["ethereum", "polkadot", "solana", "bittensor", "bitcoin"] : []}
        disabled={!isLedgerCapable}
        to={`/accounts/add/ledger`}
      />
      <AccountCreateMethodButton
        title={t("Connect Polkadot Vault")}
        subtitle={t("Or Parity Signer (Legacy)")}
        networks={["polkadot", "bittensor"]}
        to={`/accounts/add/qr`}
      />
      <AccountCreateMethodButton
        title={t("Connect Signet")}
        subtitle={!IS_FIREFOX ? t("Connect your Signet Vault") : t("Not supported on this browser")}
        networks={!IS_FIREFOX ? ["polkadot", "bittensor"] : []}
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
              "Pick this option for Ethereum, Base, zkSync, Arbitrum, BSC, and all EVM chains."
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
            title={t("Watch Substrate Account")}
            tooltip={t(
              "Pick this option for Polkadot Relay Chain, Asset Hub, Bittensor, and most Substrate chains."
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
      <AccountTypeMethodButton
        disabled={!!platform && platform !== "bitcoin"}
        title={<SelectAccountTypeButtonHeader title={t("Watch Bitcoin Account")} />}
        platform="bitcoin"
        supportedNetworks={
          <div className="flex items-center gap-2">
            <NetworkLogo networkId="bitcoin" className="text-md" />
            <div>{t("Bitcoin accounts are watched via their xpub")}</div>
          </div>
        }
        to={`/accounts/add/watched?platform=bitcoin`}
      />
    </>
  )
}

function SelectAccountTypeSectionHeader() {
  const { t } = useTranslation()
  return (
    <>
      <div className="col-span-2 text-bold text-md text-white">{t("Select account type")}</div>
      <div className="col-span-2 -mt-2 text-sm text-white/40">
        {t(
          "If you don't know which to pick, search for the network you want to use and Talisman will recommend the account type."
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
    [networks, platform]
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
  bittensor: <BittensorCircleBorderedLogo />,
  bitcoin: <BitcoinCircleBorderedLogo />,
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
  networks?: Array<"ethereum" | "polkadot" | "solana" | "bittensor" | "bitcoin">
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
      className={cn(
        "relative flex flex-col gap-12 rounded bg-white/5 p-10",
        disabled && "text-body-secondary opacity-40",
        !disabled && "cursor-pointer text-body hover:bg-white/10 focus:bg-white/10"
      )}
    >
      <span className="w-full border-grey-800 border-b pb-3 text-start">{title}</span>
      <span className="flex items-center gap-2 pr-8 text-body-secondary text-lg">
        {networks?.map((network, i) => (
          <span key={network} className={cn(i + 1 < networks.length && "-mr-6")}>
            {networkChoices[network]}
          </span>
        ))}
        <span className="text-xs">{subtitle}</span>
      </span>
    </button>
  )
}
