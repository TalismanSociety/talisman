import { CheckCircleIcon, XIcon } from "@talisman/theme/icons/"
import { FC, ReactNode } from "react"
import { Trans, useTranslation } from "react-i18next"
import styled from "styled-components"

const H1 = styled.h1`
  margin-bottom: 0.8rem;
`

const H3 = styled.h3`
  margin-bottom: 0.8rem;
`

const StyledCheckCircleIcon = styled(CheckCircleIcon)`
  color: var(--color-primary);
  width: 1.8rem;
  height: 1.8rem;
  margin-right: 1.2rem;
`

const StyledXIcon = styled(XIcon)`
  color: var(--color-status-negative);
  width: 1.8rem;
  height: 1.8rem;
  margin-right: 1.2rem;
`

const TickList = styled.ul<{ tick?: boolean }>`
  color: var(--color-mid);
  margin: 0;
  padding-left: 0px;
  list-style: none;

  li {
    display: flex;
    align-items: center;
  }
`

const MoreInfoText = styled.div`
  font-size: var(--font-size-small);
  color: var(--color-mid);
  > a {
    text-decoration: underline;
  }

  a:link,
  a:visited {
    color: var(--color-mid);
  }
  a:hover,
  a:active {
    color: var(--color-foreground);
  }
`

const AnalyticsContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2.4rem;
`

export const AnalyticsOptInInfo: FC<{
  className?: string
  children?: ReactNode
}> = ({ className, children }) => {
  const { t } = useTranslation("admin")

  return (
    <AnalyticsContainer className={className}>
      <H1>{t("Help us improve Talisman")}</H1>
      <p>
        {t(
          "We want to build simple tools that empower our users and allow them navigate web3 applications with ease. To help improve our product and features we'd like to collect anonymous usage information. This is optional, and you can opt-out at any time."
        )}
      </p>
      <div>
        <H3>{t("What we track")}</H3>
        <TickList tick>
          <li>
            <StyledCheckCircleIcon />
            {t("Anonymous user data")}
          </li>
          <li>
            <StyledCheckCircleIcon />
            {t("Basic UI metrics")}
          </li>
        </TickList>
      </div>
      <div>
        <H3>{t("What we don't track")}</H3>
        <TickList>
          <li>
            <StyledXIcon />
            {t("Identifying personal data such as IP addresses")}
          </li>
          <li>
            <StyledXIcon />
            {t("Recovery phrases or private keys")}
          </li>
          <li>
            <StyledXIcon />
            {t("Public addresses")}
          </li>
        </TickList>
      </div>
      {children}
      <MoreInfoText>
        <Trans t={t}>
          For more information please read our{" "}
          <a
            href="https://docs.talisman.xyz/talisman/legal-and-security/privacy-policy"
            target="_blank"
            rel="noreferrer"
          >
            Privacy Policy
          </a>
        </Trans>
      </MoreInfoText>
    </AnalyticsContainer>
  )
}
