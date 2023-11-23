import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Setting } from "@talisman/components/Setting"
import {
  BellIcon,
  ChevronRightIcon,
  DollarSignIcon,
  EyeOffIcon,
  FlagIcon,
  KeyIcon,
  TerminalIcon,
  UserIcon,
} from "@talismn/icons"
import { AvatarTypeSelect } from "@ui/domains/Settings/AvatarTypeSelect"
import { useAppState } from "@ui/hooks/useAppState"
import { useSetting } from "@ui/hooks/useSettings"
import { Trans, useTranslation } from "react-i18next"
import { CtaButton, Toggle, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { DashboardLayout } from "../../layout/DashboardLayout"

export const GeneralPage = () => {
  const { t } = useTranslation("admin")
  const [hasSpiritKey] = useAppState("hasSpiritKey")
  const [useTestnets, setUseTestnets] = useSetting("useTestnets")
  const [hideBalances, setHideBalances] = useSetting("hideBalances")
  const [identiconType, setIdenticonType] = useSetting("identiconType")
  const [allowNotifications, setAllowNotifications] = useSetting("allowNotifications")
  const [spiritClanFeatures, setSpiritClanFeatures] = useSetting("spiritClanFeatures")

  return (
    <DashboardLayout centered>
      <HeaderBlock title={t("General")} text={t("General settings")} />
      <div className="mt-16 flex flex-col gap-4">
        <Setting
          iconLeft={KeyIcon}
          title={t("Pre-release features")}
          subtitle={
            <Trans t={t}>
              <a
                className="text-grey-200 hover:text-body"
                href="https://docs.talisman.xyz/talisman/explore-the-paraverse/talisman-portal/spirit-keys-and-commendations#sprit-keys"
                target="_blank"
                rel="noreferrer"
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
          title={t("Hide balances")}
          subtitle={t("Blurs your portfolio and account balances")}
        >
          <Toggle checked={hideBalances} onChange={(e) => setHideBalances(e.target.checked)} />
        </Setting>
        <CtaButton
          iconLeft={FlagIcon}
          iconRight={ChevronRightIcon}
          title={t("Language")}
          subtitle={t("Change the wallet display language")}
          to={`/settings/language`}
        />
        <CtaButton
          iconLeft={DollarSignIcon}
          iconRight={ChevronRightIcon}
          title={t("Currency")}
          subtitle={t("Set currencies for viewing your portolio value")}
          to={`/settings/currency`}
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
