import { InfoIcon } from "@talisman/theme/icons"
import { FC } from "react"
import styled from "styled-components"
import Fiat from "../Fiat"
import { Tokens } from "../Tokens"
import { SendTokensExpectedResult } from "./types"

const Container = styled.div`
  &&& {
    margin-top: 2rem;
    display: block;
    color: var(--color-mid);
    font-size: var(--font-size-small);
    line-height: var(--font-size-medium);
    text-align: left;
    svg {
      margin-right: 0.2em;
      vertical-align: text-top;
    }
  }
`

type SendForfeitInfoProps = {
  expectedResult?: SendTokensExpectedResult
}

export const SendForfeitInfo: FC<SendForfeitInfoProps> = ({ expectedResult }) => {
  if (!expectedResult?.forfeits.length) return null

  return (
    <>
      {expectedResult.forfeits.map((forfeit) => (
        <Container key={forfeit.symbol}>
          <InfoIcon />
          <Tokens noCountUp amount={forfeit.amount.tokens} symbol={forfeit.symbol} />
          {forfeit.amount.fiat("usd") !== null && (
            <>
              {" "}
              (<Fiat noCountUp amount={forfeit.amount.fiat("usd")} currency="usd" />)
            </>
          )}{" "}
          will be forfeited.
        </Container>
      ))}
    </>
  )
}
