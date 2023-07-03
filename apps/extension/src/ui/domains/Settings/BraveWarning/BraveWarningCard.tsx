import Button from "@talisman/components/Button"
import { Card } from "@talisman/components/Card"
import { BraveIcon } from "@talisman/theme/icons"
import { useTranslation } from "react-i18next"
import styled from "styled-components"

type Props = {
  className?: string
  onLearnMoreClick?: () => void
}

export const BraveWarningCard = styled(({ className, onLearnMoreClick }: Props) => {
  const { t } = useTranslation()
  return (
    <Card
      className={className}
      title={
        <>
          <BraveIcon className="icon" /> {t("Attention Brave users")}
        </>
      }
      description={
        <span>
          {t("Due to a recent update, users may be experiencing issues loading balances.")}
        </span>
      }
      cta={<Button onClick={onLearnMoreClick}>{t("Learn more")}</Button>}
    />
  )
})`
  margin: 2rem;

  .icon {
    color: var(--color-primary);
  }

  .card-title {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .card-description {
    color: var(--color-mid);
    font-size: small;
  }

  .card-cta > * {
    width: 100%;
  }
`
