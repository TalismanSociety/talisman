import { getIsLedgerCapable } from "@core/util/getIsLedgerCapable"
import HeaderBlock from "@talisman/components/HeaderBlock"
import Spacer from "@talisman/components/Spacer"
import {
  ChevronRightIcon,
  EyePlusIcon,
  FileTextIcon,
  PlusIcon,
  PolkadotVaultIcon,
  SeedIcon,
  UsbIcon,
} from "@talisman/theme/icons"
import { DashboardLayout } from "@ui/apps/dashboard/layout/DashboardLayout"
import { useAppState } from "@ui/hooks/useAppState"
import { useIsFeatureEnabled } from "@ui/hooks/useFeatures"
import { useSetting } from "@ui/hooks/useSettings"
import { useTranslation } from "react-i18next"
import { CtaButton } from "talisman-ui"

export const AccountAddTypePickerPage = () => {
  const isLedgerCapable = getIsLedgerCapable()
  const [hasSpiritKey] = useAppState("hasSpiritKey")
  const [spiritClanFeatures] = useSetting("spiritClanFeatures")
  const paritySignerEnabled =
    useIsFeatureEnabled("PARITY_SIGNER") || (hasSpiritKey && spiritClanFeatures)
  const { t } = useTranslation("admin")

  return (
    <DashboardLayout centered>
      <HeaderBlock
        title={t("Add Account")}
        text={t("Create a new account or import an existing one")}
      />
      <Spacer />
      <div className="grid grid-cols-2 gap-12">
        <CtaButton
          size="small"
          iconRight={ChevronRightIcon}
          iconLeft={PlusIcon}
          title={t("New Account")}
          subtitle={t("Create a new account")}
          to={`/accounts/add/derived`}
        />
        <CtaButton
          size="small"
          iconLeft={SeedIcon}
          iconRight={ChevronRightIcon}
          title={t("Import via Recovery Phrase")}
          subtitle={t("Your Polkadot or Ethereum account")}
          to={`/accounts/add/secret`}
        />
        <CtaButton
          size="small"
          iconLeft={FileTextIcon}
          iconRight={ChevronRightIcon}
          title={t("Import via JSON file")}
          subtitle={t("Import your Polkadot.js account")}
          to={`/accounts/add/json`}
        />
        <CtaButton
          size="small"
          iconLeft={UsbIcon}
          iconRight={ChevronRightIcon}
          title={t("Import from Ledger")}
          subtitle={
            isLedgerCapable
              ? t("Connect your Ledger wallet")
              : t("Connect your Ledger wallet (not supported on this browser)")
          }
          to={`/accounts/add/ledger`}
          disabled={!isLedgerCapable}
        />
        {paritySignerEnabled && (
          <CtaButton
            size="small"
            iconLeft={PolkadotVaultIcon}
            iconRight={ChevronRightIcon}
            title={t("Import Polkadot Vault")}
            subtitle={t("Or Parity Signer (Legacy)")}
            to={`/accounts/add/qr`}
          />
        )}
        <CtaButton
          size="small"
          iconLeft={EyePlusIcon}
          iconRight={ChevronRightIcon}
          title={t("Add Watched Account")}
          subtitle={t("Add a watch only address")}
          to={`/accounts/add/watched`}
        />
      </div>
    </DashboardLayout>
  )
}
