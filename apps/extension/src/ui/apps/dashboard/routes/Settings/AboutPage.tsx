import {
  CodeIcon,
  ExternalLinkIcon,
  GitPullRequestIcon,
  HelpCircleIcon,
  MapIcon,
  TalismanHandIcon,
} from "@talismn/icons"
import { Trans, useTranslation } from "react-i18next"
import { CtaButton } from "talisman-ui"

import {
  PRIVACY_POLICY_URL,
  RELEASE_NOTES_URL,
  TALISMAN_DOCS_URL_PREFIX,
  TERMS_OF_USE_URL,
} from "@extension/shared"
import { HeaderBlock } from "@talisman/components/HeaderBlock"

import { DashboardLayout } from "../../layout"

const Content = () => {
  const { t } = useTranslation("admin")
  return (
    <>
      <HeaderBlock title={t("About")} />
      <div className="text-body-secondary mb-12 mt-4 flex flex-col gap-4 text-sm">
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
      <div className="flex flex-col gap-4">
        <CtaButton
          title={t("Privacy Policy")}
          subtitle={t("Read our Privacy Policy")}
          to={PRIVACY_POLICY_URL}
          iconLeft={TalismanHandIcon}
          iconRight={ExternalLinkIcon}
        />
        <CtaButton
          title={t("Terms of Use")}
          subtitle={t("Read our Terms of Use")}
          to={TERMS_OF_USE_URL}
          iconLeft={MapIcon}
          iconRight={ExternalLinkIcon}
        />
        <CtaButton
          title={t("Docs")}
          subtitle={t("Learn how to use Talisman")}
          to={TALISMAN_DOCS_URL_PREFIX}
          iconLeft={CodeIcon}
          iconRight={ExternalLinkIcon}
        />
        <CtaButton
          title={t("Changelog")}
          subtitle={t("Review wallet release notes")}
          to={RELEASE_NOTES_URL}
          iconLeft={GitPullRequestIcon}
          iconRight={ExternalLinkIcon}
        />
        <CtaButton
          title={t("Help and Support")}
          subtitle={t("For help and support please visit our Discord")}
          to="https://discord.gg/EF3Zf4R5bD"
          iconLeft={HelpCircleIcon}
          iconRight={ExternalLinkIcon}
        />
      </div>
    </>
  )
}

export const AboutPage = () => (
  <DashboardLayout sidebar="settings">
    <Content />
  </DashboardLayout>
)
