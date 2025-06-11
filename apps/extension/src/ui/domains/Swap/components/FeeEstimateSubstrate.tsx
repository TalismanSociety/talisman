import { classNames } from "@talismn/util"
import { atom, useAtomValue } from "jotai"
import { loadable } from "jotai/utils"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { useGetFeeEstimate } from "@ui/domains/Staking/shared/useGetFeeEstimate"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

import { fromAmountAtom, fromAssetAtom } from "../swap-modules/common.swap-module"
import { useFastBalance } from "../swaps-port/useFastBalance"
import { selectedSwapModuleAtom } from "../swaps.api"

export const FeeEstimateSubstrate = ({
  fastBalance,
}: {
  fastBalance: ReturnType<typeof useFastBalance>
}) => {
  const { t } = useTranslation()

  const fromAsset = useAtomValue(fromAssetAtom)
  const fromAmount = useAtomValue(fromAmountAtom)
  const swapModule = useAtomValue(selectedSwapModuleAtom)

  const { data: sapi } = useScaleApi(
    fromAsset?.networkType === "substrate" ? String(fromAsset.chainId) : null,
  )
  const allowReap = useMemo(
    () =>
      fastBalance?.balance?.stayAlive.planck !== undefined &&
      fromAmount.planck > fastBalance.balance.stayAlive.planck,
    [fastBalance, fromAmount.planck],
  )
  const substratePayloadAtom = useMemo(
    () => swapModule?.substratePayloadAtom?.(sapi, allowReap) ?? atom(null),
    [swapModule, sapi, allowReap],
  )
  const payloadLoadable = useAtomValue(loadable(substratePayloadAtom))

  const feeEstimate = useGetFeeEstimate({
    sapi,
    payload: payloadLoadable.state === "hasData" ? payloadLoadable.data?.payload : undefined,
  })

  return (
    <div className="text-body-secondary flex min-h-[4.48rem] items-center justify-between gap-8 px-2 pb-10 text-sm">
      <div className="whitespace-nowrap">{t("Estimated Fee")} </div>
      <div>
        {feeEstimate.error ? (
          <div className={"text-alert-error truncate"}>{t("Failed to estimate fee")}</div>
        ) : payloadLoadable.state === "loading" || feeEstimate.isLoading ? (
          <div className={"text-body-disabled bg-body-disabled rounded-xs animate-pulse"}>
            0.0000 TKN ($0.00)
          </div>
        ) : (feeEstimate.data || feeEstimate.data === 0n) && fromAsset?.id ? (
          <TokensAndFiat
            tokenId={fromAsset.id}
            planck={feeEstimate.data}
            tokensClassName="text-body"
            fiatClassName="text-body-secondary"
            className={classNames(feeEstimate.isLoading && "animate-pulse")}
          />
        ) : null}
      </div>
    </div>
  )
}
