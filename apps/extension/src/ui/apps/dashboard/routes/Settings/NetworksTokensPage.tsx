import {
  ChevronRightIcon,
  DiamondIcon,
  GlobeIcon,
  ListIcon,
  PolkadotVaultIcon,
  TerminalIcon,
} from "@talismn/icons"
import { useTranslation } from "react-i18next"
import { CtaButton, Toggle } from "talisman-ui"

import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Setting } from "@talisman/components/Setting"
import { Spacer } from "@talisman/components/Spacer"
import { useSetting } from "@ui/state"

import { DashboardLayout } from "../../layout"

const Content = () => {
  const { t } = useTranslation("admin")
  const [useTestnets, setUseTestnets] = useSetting("useTestnets")

  return (
    <>
      <HeaderBlock
        title={t("Networks & Tokens")}
        text={t("View, edit and add custom networks and tokens")}
      />
      <Spacer large />
      <div className="flex flex-col gap-4">
        <CtaButton
          iconLeft={DiamondIcon}
          iconRight={ChevronRightIcon}
          title={t("Asset discovery")}
          subtitle={t("Scan for well-known tokens in your accounts and add them to Talisman")}
          to={`/settings/networks-tokens/asset-discovery`}
        />
        <div className="via-primary/10 my-4 h-0.5 bg-gradient-to-r from-transparent to-transparent"></div>
        <Setting
          iconLeft={TerminalIcon}
          title={t("Enable testnets")}
          subtitle={
            <>
              {t("Connect to test networks")}
              <span> | </span>
              <a
                className="text-grey-200 hover:text-body"
                href="https://paritytech.github.io/polkadot-testnet-faucet"
                target="_blank"
                rel="noreferrer noopener"
              >
                {t("Faucets")}
              </a>
            </>
          }
        >
          <Toggle checked={useTestnets} onChange={(e) => setUseTestnets(e.target.checked)} />
        </Setting>
        <CtaButton
          iconLeft={GlobeIcon}
          iconRight={ChevronRightIcon}
          title={t("Manage networks")}
          subtitle={t("Add, enable and disable networks")}
          to={`/settings/networks-tokens/networks/ethereum`}
        />
        <CtaButton
          iconLeft={ListIcon}
          iconRight={ChevronRightIcon}
          title={t("Manage Ethereum tokens")}
          subtitle={t("Add or delete custom ERC20 tokens")}
          to={`/settings/networks-tokens/tokens`}
        />
        <CtaButton
          iconLeft={PolkadotVaultIcon}
          iconRight={ChevronRightIcon}
          title={t("Polkadot Vault metadata")}
          subtitle={t("Register networks on your Polkadot Vault device, or update their metadata")}
          to={`/settings/networks-tokens/qr-metadata`}
        />
      </div>
    </>
  )
}

export const NetworksTokensPage = () => (
  <DashboardLayout sidebar="settings">
    <Content />
  </DashboardLayout>
)
