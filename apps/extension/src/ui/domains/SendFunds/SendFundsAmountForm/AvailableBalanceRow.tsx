import { classNames } from "@talismn/util"
import { useTranslation } from "react-i18next"

import { Fiat } from "../../Asset/Fiat"
import Tokens from "../../Asset/Tokens"
import { useSendFunds } from "../useSendFunds"
import { Container } from "./Container"

export const AvailableBalanceRow = () => {
  const { t } = useTranslation()
  const { balance, token } = useSendFunds()

  return (
    <Container className="space-y-4 px-8 py-4">
      <div className="flex w-full items-center justify-between">
        <div>{t("Available Balance")}</div>
        {balance && token && (
          <div
            className={classNames(
              "flex items-center gap-2",
              balance?.status === "cache" && "animate-pulse"
            )}
          >
            <Tokens
              className="text-body"
              amount={balance.transferable.tokens}
              decimals={token?.decimals}
              symbol={token?.symbol}
              noCountUp
              isBalance
            />
            <span>
              (<Fiat amount={balance.transferable} noCountUp isBalance />)
            </span>
          </div>
        )}
      </div>
    </Container>
  )
}
