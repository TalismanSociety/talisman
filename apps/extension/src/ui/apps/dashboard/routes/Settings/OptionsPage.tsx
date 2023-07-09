import { HeaderBlock } from "@talisman/components/HeaderBlock"
import Setting from "@talisman/components/Setting"
import { AvatarTypeSelect } from "@ui/domains/Settings/AvatarTypeSelect"
import { useAppState } from "@ui/hooks/useAppState"
import { useSetting } from "@ui/hooks/useSettings"
import { Trans, useTranslation } from "react-i18next"
import { Toggle, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { DashboardLayout } from "../../layout/DashboardLayout"

export const OptionsPage = () => {
  const { t } = useTranslation("admin")
  const [hasSpiritKey] = useAppState("hasSpiritKey")
  const [identiconType, setIdenticonType] = useSetting("identiconType")
  const [useTestnets, setUseTestnets] = useSetting("useTestnets")
  const [hideBalances, setHideBalances] = useSetting("hideBalances")
  const [allowNotifications, setAllowNotifications] = useSetting("allowNotifications")
  const [spiritClanFeatures, setSpiritClanFeatures] = useSetting("spiritClanFeatures")

  return (
    <DashboardLayout centered withBack backTo="/settings">
      <HeaderBlock title={t("Extension options")} text={t("Customise your extension experience")} />
      <div className="mt-16 flex flex-col gap-12">
        <Setting
          title={t("Enable Testnets")}
          subtitle={t("Connect to test networks (Westend, Mandala)")}
        >
          <Toggle checked={useTestnets} onChange={(e) => setUseTestnets(e.target.checked)} />
        </Setting>
        <Setting
          title={t("Allow notifications")}
          subtitle={t("Allow Talisman to send you notifications about transactions in progress")}
        >
          <Toggle
            checked={allowNotifications}
            onChange={(e) => setAllowNotifications(e.target.checked)}
          />
        </Setting>
        <Setting
          title={t("Hide Balances")}
          subtitle={t("Blurs your portfolio and account balances")}
        >
          <Toggle checked={hideBalances} onChange={(e) => setHideBalances(e.target.checked)} />
        </Setting>
        <Setting
          title={t("Account Avatars")}
          subtitle={t("Choose between the Talisman orbs or Polkadot.js identicons")}
        >
          <AvatarTypeSelect selectedType={identiconType} onChange={setIdenticonType} />
        </Setting>
        <Setting
          title={t("Pre-release features")}
          subtitle={
            <Trans t={t}>
              <a
                href="https://docs.talisman.xyz/talisman/explore-the-paraverse/talisman-portal/spirit-keys-and-commendations#sprit-keys"
                target="_blank"
                className="text-grey-200 hover:text-body"
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
              <TooltipContent>t("You need a Spirit Key to enable this option")</TooltipContent>
            )}
          </Tooltip>
        </Setting>
      </div>
    </DashboardLayout>
  )
}
