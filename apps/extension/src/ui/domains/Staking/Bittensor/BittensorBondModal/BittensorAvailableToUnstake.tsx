import { planckToTokens } from "@talismn/util"
import { BigNumber } from "bignumber.js"
import { useMemo } from "react"

import { Fiat } from "@ui/domains/Asset/Fiat"
import { Tokens } from "@ui/domains/Asset/Tokens"

import { useBittensorBondWizard } from "../hooks/useBittensorBondWizard"
import { ROOT_NETUID } from "../utils/constants"

export const BittensorAvailableToUnstake = () => {
  const { netuid, token, selectedStake } = useBittensorBondWizard()

  const isRootStake = useMemo(() => Number(netuid) === ROOT_NETUID, [netuid])

  const { meta: { dynamicInfo = {}, amountStaked } = {}, tokens, fiat } = selectedStake ?? {}

  const tokenBalance = useMemo(() => {
    const alphaBalanceInTao = new BigNumber(planckToTokens(amountStaked, token?.decimals) || "0")
    return alphaBalanceInTao.gt(0) ? alphaBalanceInTao : tokens
  }, [amountStaked, tokens, token?.decimals])

  const subnetTokenSymbol = useMemo(
    () => `SN${netuid} ${dynamicInfo.subnetIdentity?.subnet_name} ${dynamicInfo.tokenSymbol}`,
    [dynamicInfo.subnetIdentity?.subnet_name, dynamicInfo.tokenSymbol, netuid],
  )

  const symbol = useMemo(
    () => (isRootStake ? token?.symbol : subnetTokenSymbol),
    [isRootStake, subnetTokenSymbol, token?.symbol],
  )

  return (
    <div className="text-body flex items-center gap-2">
      <Tokens amount={tokenBalance} symbol={symbol} className="max-w-[15rem] truncate" />
      <Fiat amount={fiat} />
    </div>
  )
}
