import { getIsLedgerCapable } from "@core/util/getIsLedgerCapable"
import CtaButton from "@talisman/components/CtaButton"
import Grid from "@talisman/components/Grid"
import HeaderBlock from "@talisman/components/HeaderBlock"
import Spacer from "@talisman/components/Spacer"
import { KeyIcon, PlusIcon, PolkadotVaultIcon, SeedIcon, UsbIcon } from "@talisman/theme/icons"
import { useAppState } from "@ui/hooks/useAppState"
import { useIsFeatureEnabled } from "@ui/hooks/useFeatures"
import { useSetting } from "@ui/hooks/useSettings"
import { useTranslation } from "react-i18next"
import styled from "styled-components"

import Layout from "../layout"

// workaround for plus icon's padding
const LargePlusIcon = styled(PlusIcon)`
  font-size: 2rem;
`

const AccountAddTypePicker = () => {
  const isLedgerCapable = getIsLedgerCapable()
  const [hasSpiritKey] = useAppState("hasSpiritKey")
  const [spiritClanFeatures] = useSetting("spiritClanFeatures")
  const paritySignerEnabled =
    useIsFeatureEnabled("PARITY_SIGNER") || (hasSpiritKey && spiritClanFeatures)
  const { t } = useTranslation()

  return (
    <Layout centered>
      <HeaderBlock
        title={t("Add Account")}
        text={t("Create a new account or import an existing one")}
      />
      <Spacer />
      <Grid columns={2}>
        <CtaButton
          icon={<LargePlusIcon />}
          title={t("New Account")}
          subtitle={t("Create a new account")}
          to={`/accounts/add/derived`}
        />
        <CtaButton
          icon={<SeedIcon />}
          title={t("Import via Recovery Phrase")}
          subtitle={t("Your Polkadot or Ethereum account")}
          to={`/accounts/add/secret`}
        />
        <CtaButton
          icon={<KeyIcon />}
          title={t("Import via JSON file")}
          subtitle={t("Import your Polkadot.js account")}
          to={`/accounts/add/json`}
        />
        <CtaButton
          icon={<UsbIcon />}
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
            icon={<PolkadotVaultIcon />}
            title={t("Import Polkadot Vault")}
            subtitle={t("Or Parity Signer (Legacy)")}
            to={`/accounts/add/qr`}
          />
        )}
      </Grid>
    </Layout>
  )
}

export default AccountAddTypePicker
