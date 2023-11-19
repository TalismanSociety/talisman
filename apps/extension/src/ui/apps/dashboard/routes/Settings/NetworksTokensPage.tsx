import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Setting } from "@talisman/components/Setting"
import { Spacer } from "@talisman/components/Spacer"
import {
  ChevronRightIcon,
  GlobeIcon,
  ListIcon,
  PolkadotVaultIcon,
  TerminalIcon,
} from "@talismn/icons"
import { useSetting } from "@ui/hooks/useSettings"
import { useTranslation } from "react-i18next"
import { CtaButton, Toggle } from "talisman-ui"

import { DashboardLayout } from "../../layout/DashboardLayout"

export const NetworksTokensPage = () => {
  const { t } = useTranslation("admin")
  const [useTestnets, setUseTestnets] = useSetting("useTestnets")

  return (
    <DashboardLayout centered>
      <HeaderBlock
        title={t("Networks & Tokens")}
        text={t("View, edit and add custom networks and tokens")}
      />
      <Spacer large />
      <div className="flex flex-col gap-4">
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
                rel="noreferrer"
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
          title={t("Manage Networks")}
          subtitle={t("View, edit and delete custom networks")}
          to={`/networks/ethereum`}
        />
        <CtaButton
          iconLeft={ListIcon}
          iconRight={ChevronRightIcon}
          title={t("Manage Ethereum Tokens")}
          subtitle={t("Add or delete custom ERC20 tokens")}
          to={`/tokens`}
        />
        <CtaButton
          iconLeft={PolkadotVaultIcon}
          iconRight={ChevronRightIcon}
          title={t("Polkadot Vault Metadata")}
          subtitle={t("Register networks on your Polkadot Vault device, or update their metadata")}
          to={`/settings/qr-metadata`}
        />
      </div>
    </DashboardLayout>
  )
}
