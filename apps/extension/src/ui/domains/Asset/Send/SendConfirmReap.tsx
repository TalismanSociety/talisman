import Button from "@talisman/components/Button"
import { Drawer } from "@talisman/components/Drawer"
import { IconButton } from "@talisman/components/IconButton"
import { SimpleButton } from "@talisman/components/SimpleButton"
import { XIcon } from "@talisman/theme/icons"
import { formatDecimals } from "@talismn/util"
import { FC, useCallback, useEffect, useMemo, useState } from "react"
import styled from "styled-components"

import { useSendTokens } from "./context"
import { SendTokensExpectedResult } from "./types"

const Container = styled.div`
  width: 100%;
  max-width: 42rem;
  box-sizing: border-box;
  background: var(--color-background);
  border: 1px solid var(--color-background-muted-3x);
  border-radius: 1.6rem;
  padding: 2.4rem 2.4rem 2.9rem 2.4rem;
  text-align: center;

  > header {
    display: flex;
    color: var(--color-foreground);

    h1 {
      flex-grow: 1;
      line-height: 2.4rem;
      font-size: 1.8rem;
    }
  }

  > section > p {
    color: var(--color-mid);
    font-size: 1.4rem;
    line-height: 2rem;

    a,
    a:link,
    a:visited {
      color: var(--color-foreground-muted) !important;
      text-decoration: underline;
      opacity: 0.9;
      margin-top: 1rem;
    }
    a:hover,
    a:active {
      color: var(--color-foreground) !important;
      opacity: 1;
    }
  }

  > footer {
    padding-top: 3.2rem;
    display: flex;
    flex-direction: column;
    gap: 1.6rem;

    button {
      width: 100%;
    }
  }
`

const Error = styled.div`
  color: var(--color-status-error);
`

export const SendConfirmReap: FC = () => {
  const { expectedResult, acceptForfeit, cancel, showConfirmReap } = useSendTokens()
  const [error, setError] = useState<string>()
  const [submitting, setSubmitting] = useState<boolean>()

  const [savedExpectedResult, setSavedExpectedResult] = useState<SendTokensExpectedResult>()
  useEffect(() => {
    // save result as state to prevent flickering while modal closes
    if (setSavedExpectedResult) setSavedExpectedResult(expectedResult)
    // reset
    setError(undefined)
    setSubmitting(false)
  }, [expectedResult])

  const { title, description } = useMemo(() => {
    if (savedExpectedResult?.type !== "substrate") return { title: "", description: "" }

    const { forfeits } = savedExpectedResult
    const amounts = forfeits
      .map(({ amount, symbol, decimals }) => `${formatDecimals(amount.tokens, decimals)} ${symbol}`)
      .join(" and ")
    const existentialDeposits = forfeits
      .map(
        ({ existentialDeposit, symbol, decimals }) =>
          `${formatDecimals(existentialDeposit.tokens, decimals)} ${symbol}`
      )
      .join(" or ")
    const tokens = forfeits.map(({ symbol }) => symbol).join(" and ")

    return {
      title: `${amounts} will be forfeited`,
      description: `This transaction will cause ${tokens} to be lost. If your balance falls below the minimum of ${existentialDeposits}, any remaining tokens will be forfeited`,
    }
  }, [savedExpectedResult])

  const handleAccept = useCallback(async () => {
    setSubmitting(true)
    setError(undefined)
    try {
      await acceptForfeit()
    } catch (err) {
      setError((err as Error).message)
    }
    setSubmitting(false)
  }, [acceptForfeit])

  return (
    <Drawer asChild open={showConfirmReap} anchor="bottom" onClose={cancel}>
      <Container>
        <header>
          <h1>{title}</h1>
          <div>
            <IconButton onClick={cancel}>
              <XIcon />
            </IconButton>
          </div>
        </header>
        <section>
          <p>{description}</p>
          <p>
            <a
              href="https://wiki.polkadot.network/docs/build-protocol-info#existential-deposit"
              target="_blank"
              rel="noreferrer"
            >
              Learn more
            </a>
          </p>
        </section>
        <footer>
          <Error>{error}</Error>
          <SimpleButton
            primary
            onClick={handleAccept}
            processing={submitting}
            disabled={submitting}
          >
            Proceed anyway
          </SimpleButton>
          <Button onClick={cancel}>Cancel</Button>
        </footer>
      </Container>
    </Drawer>
  )
}
