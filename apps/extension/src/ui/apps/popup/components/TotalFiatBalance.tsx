import { IconButton } from "@talisman/components/IconButton"
import { EyeIcon, EyeOffIcon } from "@talisman/theme/icons"
import Asset from "@ui/domains/Asset"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import useBalances from "@ui/hooks/useBalances"
import { useSetting } from "@ui/hooks/useSettings"
import { FC, useCallback } from "react"
import { useTranslation } from "react-i18next"
import styled from "styled-components"

const ToggleHide = styled(IconButton).attrs((props: { showIcon?: boolean }) => ({
  showIcon: !!props.showIcon,
}))`
  position: absolute;
  top: 0;
  left: 0.5rem;
  display: ${({ showIcon }) => (showIcon ? "inline-block" : "none")};
  font-size: 1.6rem;
  width: 2rem;
  height: 2rem;
`
const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  span {
    font-size: var(--font-size-large);
    font-weight: var(--font-weight-bold);
  }

  &:hover {
    ${ToggleHide} {
      display: inline-block;
    }
  }

  .fiat {
    width: 65%;
    text-align: center;
  }

  .balance-revealable {
    border-radius: 10px;
  }
  .balance-revealable::after {
    border-radius: 10px;
  }
`

const TitleRow = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
  align-items: center;
`

const Title = styled.h3`
  font-size: var(--font-size-small);
  color: var(--color-mid);
  margin: 0;
`

const Side = styled.div`
  position: relative;
  font-size: 1.4rem;
  flex-grow: 0.5;
  height: 2rem;
`

// force height to prevent flickering
const TotalFiat = styled.div`
  height: 2.9rem;

  span {
    display: inline-block;
    min-width: 15rem;
  }
`

export const TotalFiatBalance: FC<{ className?: string }> = ({ className }) => {
  const { t } = useTranslation("portfolio")
  const balances = useBalances("portfolio")

  const [hideBalances, setHideBalances] = useSetting("hideBalances")
  const { genericEvent } = useAnalytics()

  const toggleHideBalance = useCallback(() => {
    genericEvent("toggle hide balance")
    setHideBalances((prev) => !prev)
  }, [genericEvent, setHideBalances])

  return (
    <Container className={className}>
      <TitleRow>
        <Side></Side>
        <Title>{t("Total Portfolio")}</Title>
        <Side>
          <ToggleHide showIcon={hideBalances} onClick={toggleHideBalance}>
            {hideBalances ? <EyeIcon /> : <EyeOffIcon />}
          </ToggleHide>
        </Side>
      </TitleRow>
      <TotalFiat>
        <Asset.Fiat amount={balances?.sum.fiat("usd").total} currency="usd" isBalance />
      </TotalFiat>
    </Container>
  )
}
