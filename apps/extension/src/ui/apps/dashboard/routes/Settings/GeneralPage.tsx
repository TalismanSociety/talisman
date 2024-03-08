import { SPIRIT_KEYS_DOCS_URL } from "@extension/shared"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Setting } from "@talisman/components/Setting"
import {
  BellIcon,
  ChevronRightIcon,
  CoinsIcon,
  DollarSignIcon,
  EyeOffIcon,
  FlagIcon,
  KeyIcon,
  RefreshCwIcon,
  UserIcon,
} from "@talismn/icons"
import { AnalyticsPage } from "@ui/api/analytics"
import { AvatarTypeSelect } from "@ui/domains/Settings/AvatarTypeSelect"
import { useAppState } from "@ui/hooks/useAppState"
import { useRuntimeReload } from "@ui/hooks/useRuntimeReload"
import { useSetting } from "@ui/hooks/useSettings"
import { Trans, useTranslation } from "react-i18next"
import { Button, CtaButton, Toggle, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { DashboardLayout } from "../../layout/DashboardLayout"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Settings",
  featureVersion: 1,
  page: "General",
}

export const GeneralPage = () => {
  const { t } = useTranslation("admin")
  const [hasSpiritKey] = useAppState("hasSpiritKey")
  const [hideBalances, setHideBalances] = useSetting("hideBalances")
  const [hideDust, setHideDust] = useSetting("hideDust")
  const [identiconType, setIdenticonType] = useSetting("identiconType")
  const [allowNotifications, setAllowNotifications] = useSetting("allowNotifications")
  const [spiritClanFeatures, setSpiritClanFeatures] = useSetting("spiritClanFeatures")
  const [hasRuntimeReloadFn, runtimeReload] = useRuntimeReload(ANALYTICS_PAGE)

  return (
    <DashboardLayout centered>
      <HeaderBlock title={t("General")} text={t("General settings")} />
      <div className="mt-16 flex flex-col gap-4">
        {hasRuntimeReloadFn ? (
          <Setting
            iconLeft={RefreshCwIcon}
            title={t("Reload Talisman")}
            subtitle={t("Close and restart Talisman, this can help to resolve error states")}
          >
            <Button primary small onClick={runtimeReload}>
              {t("Reload")}
            </Button>
          </Setting>
        ) : null}
        <Setting
          iconLeft={KeyIcon}
          title={t("Pre-release features")}
          subtitle={
            <Trans t={t}>
              <a
                className="text-grey-200 hover:text-body"
                href={SPIRIT_KEYS_DOCS_URL}
                target="_blank"
                rel="noreferrer noopener"
              >
                Spirit Key NFT
              </a>{" "}
              holders get special early access to new features
            </Trans>
          }
        >
          <Tooltip>
            <TooltipTrigger>
              <Toggle
                disabled={!hasSpiritKey}
                checked={hasSpiritKey && spiritClanFeatures}
                onChange={(e) => setSpiritClanFeatures(e.target.checked)}
              />
            </TooltipTrigger>
            {hasSpiritKey ? undefined : (
              <TooltipContent>{t("You need a Spirit Key to enable this option")}</TooltipContent>
            )}
          </Tooltip>
        </Setting>
        <Setting
          iconLeft={BellIcon}
          title={t("Allow notifications")}
          subtitle={t("Allow Talisman to send you notifications about transactions in progress")}
        >
          <Toggle
            checked={allowNotifications}
            onChange={(e) => setAllowNotifications(e.target.checked)}
          />
        </Setting>
        <Setting
          iconLeft={EyeOffIcon}
          title={t("Blur balances")}
          subtitle={t("Conceal your portfolio and account balances")}
        >
          <Toggle checked={hideBalances} onChange={(e) => setHideBalances(e.target.checked)} />
        </Setting>
        <Setting
          iconLeft={CoinsIcon}
          title={t("Hide small balances")}
          subtitle={t("Hide tokens with a balance below US$1")}
        >
          <Toggle checked={hideDust} onChange={(e) => setHideDust(e.target.checked)} />
        </Setting>
        <CtaButton
          iconLeft={FlagIcon}
          iconRight={ChevronRightIcon}
          title={t("Language")}
          subtitle={t("Change the wallet display language")}
          to={`/settings/general/language`}
        />
        <CtaButton
          iconLeft={DollarSignIcon}
          iconRight={ChevronRightIcon}
          title={t("Currency")}
          subtitle={t("Set currencies for viewing your portolio value")}
          to={`/settings/general/currency`}
        />
        <Setting
          iconLeft={UserIcon}
          title={t("Account avatars")}
          subtitle={t("Choose between the Talisman orbs or Polkadot.js identicons")}
        >
          <AvatarTypeSelect selectedType={identiconType} onChange={setIdenticonType} />
        </Setting>
      </div>
    </DashboardLayout>
  )
}
