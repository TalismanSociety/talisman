import HeaderBlock from "@talisman/components/HeaderBlock"
import { ExternalLinkIcon } from "@talisman/theme/icons"
import { Trans, useTranslation } from "react-i18next"
import { CtaButton } from "talisman-ui"

import { DashboardLayout } from "../../layout/DashboardLayout"

export const AboutPage = () => {
  const { t } = useTranslation("admin")
  return (
    <DashboardLayout withBack centered backTo="/settings">
      <HeaderBlock title={t("About")} />
      <div className="text-body-secondary my-12 flex flex-col gap-8">
        <p>
          <Trans t={t}>
            In the beginning, the paraverse swarmed with formless life and chaotic energy.
            Travellers were lost and confused, enticed by myriad opportunities, but unable to reach
            their destinations. A team of heroic guardians forged the Talisman to help guide their
            journeys.
          </Trans>
        </p>
        <p>
          <Trans t={t}>
            Created from exotic nanoparticles, and able to safely store the deepest secrets,{" "}
            <a
              href="https://talisman.xyz"
              target="_blank"
              className="text-grey-200 hover:text-white"
            >
              Talisman
            </a>{" "}
            is here to help you start your paraverse journey.
          </Trans>
        </p>
      </div>
      <div className="mt-20 space-y-4">
        <CtaButton
          title={t("Help and Support")}
          subtitle={t("For help and support please visit our Discord")}
          to="https://discord.gg/EF3Zf4R5bD"
          iconRight={ExternalLinkIcon}
        />
        <CtaButton
          title={t("Docs")}
          subtitle={t("Learn how to use Talisman")}
          to="https://docs.talisman.xyz"
          iconRight={ExternalLinkIcon}
        />
        <CtaButton
          title={t("Changelog")}
          subtitle={t("Review wallet release notes")}
          to="https://docs.talisman.xyz/talisman/prepare-for-your-journey/wallet-release-notes"
          iconRight={ExternalLinkIcon}
        />
        <CtaButton
          title={t("Privacy Policy")}
          subtitle={t("Read our Privacy Policy")}
          to="https://docs.talisman.xyz/talisman/legal-and-security/privacy-policy"
          iconRight={ExternalLinkIcon}
        />
        <CtaButton
          title={t("Terms of Use")}
          subtitle={t("Read our Terms of Use")}
          to="https://docs.talisman.xyz/talisman/legal-and-security/terms-of-use"
          iconRight={ExternalLinkIcon}
        />
      </div>
    </DashboardLayout>
  )
}
