import type { SignerPayloadJSON } from "@core/domains/signing/types"
import { classNames } from "@talismn/util"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { useGetFeeEstimate } from "@ui/domains/Staking/shared/useGetFeeEstimate"
import { QuoteProvider } from "@ui/domains/Swap/components/QuoteProvider"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useNetworkById } from "@ui/state/chaindata"
import { useTranslation } from "react-i18next"
import { useSwap } from "../SwapProvider"
import type { Loadable } from "../swaps.api"
import type { useFastBalance } from "../swaps-port/useFastBalance"

export const FeeEstimateSubstrate = ({
  payloadLoadable,
}: {
  fastBalance?: ReturnType<typeof useFastBalance>
  payloadLoadable?: Loadable<{ payload: SignerPayloadJSON; txMetadata?: Uint8Array } | null>
}) => {
  const { t } = useTranslation()

  const { fromAsset } = useSwap()
  const fromDotNetwork = useNetworkById(String(fromAsset?.chainId), "polkadot")

  const { data: sapi } = useScaleApi(
    fromAsset?.networkType === "substrate" ? String(fromAsset.chainId) : null
  )

  const feeEstimate = useGetFeeEstimate({
    sapi,
    payload: payloadLoadable?.state === "hasData" ? payloadLoadable.data?.payload : undefined,
  })

  return (
    <div className="relative flex min-h-[4.48rem] w-full flex-col gap-4 rounded bg-grey-900 px-12 py-8 text-body-secondary text-sm">
      <QuoteProvider />

      <div className="flex items-center justify-between gap-8">
        <div className="whitespace-nowrap text-xs">{t("Estimated TX Fee")} </div>
        <div>
          {feeEstimate.error ? (
            <div className="truncate text-alert-error">{t("Failed to estimate fee")}</div>
          ) : payloadLoadable?.state === "loading" || feeEstimate.isLoading ? (
            <div className="animate-pulse rounded-xs bg-body-disabled text-body-disabled">
              0.0000 TKN ($0.00)
            </div>
          ) : (feeEstimate.data || feeEstimate.data === 0n) && fromAsset?.id ? (
            <TokensAndFiat
              className={classNames(feeEstimate.isLoading && "animate-pulse")}
              tokensClassName="text-body"
              fiatClassName="text-body-secondary"
              tokenId={fromDotNetwork?.nativeTokenId}
              planck={feeEstimate.data}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
