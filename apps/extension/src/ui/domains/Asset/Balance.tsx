import { Balance } from "@core/domains/balances/types"
import { ReactComponent as IconLoader } from "@talisman/theme/icons/loader.svg"
import { MAX_DECIMALS_FORMAT } from "@talismn/util"
import { useTranslation } from "react-i18next"
import styled from "styled-components"

import { Fiat } from "./Fiat"
import { Tokens } from "./Tokens"

export interface IAssetBalanceOptions {
  withFiat?: boolean
  row?: boolean
}

interface IAssetBalance extends IAssetBalanceOptions {
  className?: string
  balance: Balance
  noCountUp?: boolean
  isBalance?: boolean
}

const AssetBalance = ({ className, balance, withFiat, noCountUp, isBalance }: IAssetBalance) => {
  const { t } = useTranslation()

  return (
    <div className={`${className} chain-balance ${balance.id}`}>
      {balance.status === "cache" && <IconLoader className="loader animate-spin-slow" />}
      <div className="chain-balance-column">
        <Tokens
          as="div"
          className="tokens"
          amount={balance.transferable.tokens}
          symbol={balance.token?.symbol}
          decimals={balance.decimals || MAX_DECIMALS_FORMAT}
          noCountUp={noCountUp}
          isBalance={isBalance}
        />
        {!!withFiat && (
          <div className="fiat">
            {balance.token?.isTestnet ? (
              t("Testnet")
            ) : balance.transferable.fiat("usd") === null ? (
              "-"
            ) : (
              <Fiat
                amount={balance.transferable.fiat("usd")}
                currency="usd"
                isBalance={isBalance}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const StyledAssetBalance = styled(AssetBalance)`
  > .loader {
    float: left;
    margin-right: 0.5em;
  }

  > .chain-balance-column {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    justify-content: center;
  }

  > .chain-balance-column > .tokens {
    position: relative;
    line-height: 1.6rem;
    font-size: var(--font-size-normal);

    > * {
      line-height: inherit;
    }
  }

  > .chain-balance-column > .fiat {
    line-height: 1.6rem;
    color: var(--color-mid);
    font-size: var(--font-size-xsmall);

    & span {
      line-height: inherit;
    }
  }

  ${({ row }) =>
    row
      ? `
    > .chain-balance-column{
      flex-direction: row;
    }
    > .chain-balance-column > .fiat:before {
      content: " / ";
      margin-left: 0.4em;
    }
  `
      : ""}
`

export default StyledAssetBalance
