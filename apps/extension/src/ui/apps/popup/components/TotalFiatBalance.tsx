import { IconButton } from "@talisman/components/IconButton"
import { EyeIcon, EyeOffIcon } from "@talisman/theme/icons"
import Asset from "@ui/domains/Asset"
import useBalances from "@ui/hooks/useBalances"
import { useSettings } from "@ui/hooks/useSettings"
import { useCallback } from "react"
import styled from "styled-components"

const ToggleHide = styled(IconButton).attrs((props: { showIcon?: boolean }) => ({
  showIcon: !!props.showIcon,
}))`
  position: absolute;
  top: 0;
  left: 0;
  display: ${({ showIcon }) => (showIcon ? "inline-block" : "none")};
  font-size: 1.6rem;
`
const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-bottom: 2rem;

  span {
    font-size: var(--font-size-large);
    color: var(--color-foreground);
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
`

const TotalFiat = styled(Asset.Fiat)``

export const TotalFiatBalance = ({ className }: { className?: string }) => {
  const balances = useBalances()
  const { hideBalances, update } = useSettings()

  const toggleHideBalance = useCallback(() => {
    update({ hideBalances: !hideBalances })
  }, [hideBalances, update])

  return (
    <Container className={className}>
      <TitleRow>
        <Side></Side>
        <Title>Total Portfolio</Title>
        <Side>
          <ToggleHide showIcon={hideBalances} onClick={toggleHideBalance}>
            {hideBalances ? <EyeIcon /> : <EyeOffIcon />}
          </ToggleHide>
        </Side>
      </TitleRow>
      <TotalFiat amount={balances?.sum.fiat("usd").transferable} currency="usd" isBalance />
    </Container>
  )
}
