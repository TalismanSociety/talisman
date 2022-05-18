import styled from "styled-components"
import { BraveIcon } from "@talisman/theme/icons"
import { Card } from "@talisman/components/Card"
import Button from "@talisman/components/Button"

type Props = {
  className?: string
  onLearnMoreClick?: () => void
}

export const BraveWarningCard = styled(({ className, onLearnMoreClick }: Props) => {
  return (
    <Card
      className={className}
      title={
        <>
          <BraveIcon className="icon" /> Attention Brave users
        </>
      }
      description={
        <span>Due to a recent update, users may be experiencing issues loading balances</span>
      }
      cta={<Button onClick={onLearnMoreClick}>Learn more</Button>}
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
