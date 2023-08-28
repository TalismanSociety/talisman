import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Spacer } from "@talisman/components/Spacer"
import { ChevronRightIcon, GlobeIcon, ListIcon } from "@talismn/icons"
import { useTranslation } from "react-i18next"
import { CtaButton } from "talisman-ui"

import { DashboardLayout } from "../../layout/DashboardLayout"

export const NetworksTokensPage = () => {
  const { t } = useTranslation("admin")

  return (
    <DashboardLayout centered>
      <HeaderBlock
        title={t("Networks & Tokens")}
        text={t("View, edit and add custom networks and tokens")}
      />
      <Spacer large />
      <div className="flex flex-col gap-4">
        <CtaButton
          iconLeft={GlobeIcon}
          iconRight={ChevronRightIcon}
          title={t("Manage Ethereum Networks")}
          subtitle={t("Manage Ethereum compatible networks")}
          to={`/networks`}
        />
        <CtaButton
          iconLeft={ListIcon}
          iconRight={ChevronRightIcon}
          title={t("Manage Ethereum Tokens")}
          subtitle={t("Add or delete custom ERC20 tokens")}
          to={`/tokens`}
        />
      </div>
    </DashboardLayout>
  )
}
