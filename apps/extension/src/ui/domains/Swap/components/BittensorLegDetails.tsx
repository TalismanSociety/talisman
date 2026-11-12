import type { Account } from "@core/domains/keyring/exports"
import type { SignerPayloadJSON } from "@core/domains/signing/types"
import { subNativeTokenId } from "@talismn/chaindata-provider"
import type { ScaleApi } from "@talismn/sapi"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import {
  BittensorConfirmAlphaPriceValue,
  BittensorConfirmMevShieldLabel,
  BittensorConfirmMevShieldValue,
  BittensorConfirmPriceImpactValue,
  BittensorConfirmTalismanFeeLabel,
} from "@ui/domains/Staking/Bittensor/components/BittensorConfirmFields"
import { SelectValidatorPill } from "@ui/domains/Staking/Bittensor/components/SelectValidatorPill"
import { useMevShield } from "@ui/domains/Staking/Bittensor/hooks/useMevShield"
import { useMevShieldFeeEstimate } from "@ui/domains/Staking/Bittensor/hooks/useMevShieldFeeEstimate"
import { ROOT_NETUID } from "@ui/domains/Staking/Bittensor/utils/constants"
import { useToken } from "@ui/state/chaindata"
import { cn } from "@ui/util/cn"
import type { FC, ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { useSwapModal } from "../hooks/useSwapModal"
import { useSwap } from "../SwapProvider"
import { type DTaoLegData, getDTaoLegData } from "../swap-modules/bittensor-dtao-swap-module"
import type { QuoteFee, QuoteLeg } from "../swap-modules/common.swap-module"
import { SwapOtherFees } from "./SwapOtherFees"
import { SwapTxRow } from "./SwapTxCard"
import type { SwapTxProvider } from "./SwapTxDetails"

type LegMevShield = ReturnType<typeof useMevShield> & {
  /** the fee of the wrapper transaction, 0 without the shield, null until estimated */
  feePlanck: bigint | null
  isFeeLoading: boolean
  feeError: Error | null
}

export const useLegMevShield = ({
  leg,
  account,
  sapi,
  payload,
}: {
  leg: QuoteLeg | undefined
  account: Account | null
  sapi: ScaleApi | null | undefined
  payload: SignerPayloadJSON | undefined
}): LegMevShield => {
  const data = leg ? getDTaoLegData(leg) : null
  const shield = useMevShield({
    netuid: data?.netuid ?? ROOT_NETUID,
    account,
    direction: data?.direction === "unstake" ? "sell" : "buy",
  })
  const fee = useMevShieldFeeEstimate({
    sapi,
    address: account?.address ?? null,
    innerFeeEstimatePayload: payload,
    enabled: !shield.isMevShieldDisabled,
  })

  return {
    ...shield,
    feePlanck: shield.withMevShield ? (fee.data ?? null) : 0n,
    isFeeLoading: shield.withMevShield && fee.isLoading,
    feeError: shield.withMevShield ? fee.error : null,
  }
}

const Separator = () => <hr className="my-2 text-grey-800" />

const Subnet: FC<{ data: DTaoLegData; tokenId: string }> = ({ data, tokenId }) => {
  const token = useToken(tokenId, "substrate-dtao")
  return (
    <span className="truncate">
      {`SN${data.netuid} | ${[token?.subnetName, token?.symbol].filter(Boolean).join(" ")}`}
    </span>
  )
}

const Card: FC<{ children: ReactNode; className?: string }> = ({ children, className }) => (
  <section className={cn("flex w-full flex-col gap-2 rounded bg-grey-850 px-8 py-6", className)}>
    {children}
  </section>
)

export const BittensorLegDetails: FC<{
  leg: QuoteLeg
  data: DTaoLegData
  fees: QuoteFee[]
  feesLoading: boolean
  provider?: SwapTxProvider
  shield?: LegMevShield
  canPickValidator: boolean
  feeRows: ReactNode
  slippageRow: ReactNode
  containerId: string
  /** "cards" is the swap's whole body: one card per group of rows, no provider row */
  layout?: "rows" | "cards"
  children?: ReactNode
}> = ({
  leg,
  data,
  fees,
  feesLoading,
  provider,
  shield,
  canPickValidator,
  feeRows,
  slippageRow,
  containerId,
  layout = "rows",
  children,
}) => {
  const { t } = useTranslation()
  const { chooseStakeHotkey } = useSwap()
  const { close } = useSwapModal()
  const isRoot = data.netuid === ROOT_NETUID
  const isValidatorPickable =
    canPickValidator && data.direction === "stake" && data.validator === "pickable"

  const position = (
    <>
      <SwapTxRow label={t("Subnet")}>
        <Subnet
          data={data}
          tokenId={data.direction === "stake" ? leg.toTokenId : leg.fromTokenId}
        />
      </SwapTxRow>
      <SwapTxRow label={t("Validator")}>
        <SelectValidatorPill
          networkId={data.networkId}
          netuid={data.netuid}
          hotkey={data.hotkey}
          onSelect={isValidatorPickable ? chooseStakeHotkey : undefined}
          variant={layout === "cards" ? "tx" : "default"}
        />
      </SwapTxRow>
      <SwapTxRow label={t("Estimated amount")}>
        <TokensAndFiat
          tokenId={leg.toTokenId}
          planck={leg.outputAmount}
          className="text-body-secondary"
          tokensClassName="text-body"
          noCountUp
        />
      </SwapTxRow>
    </>
  )

  const pricing = (
    <>
      <SwapTxRow label={t("Alpha Price")}>
        <BittensorConfirmAlphaPriceValue
          swapPrice={data.swapPrice}
          tokenId={subNativeTokenId(data.networkId)}
        />
      </SwapTxRow>
      <SwapTxRow label={t("Price Impact")}>
        <BittensorConfirmPriceImpactValue priceImpact={data.priceImpact ?? undefined} />
      </SwapTxRow>
      {isRoot ? null : slippageRow}
      {shield ? (
        <SwapTxRow label={<BittensorConfirmMevShieldLabel containerId={containerId} />}>
          <BittensorConfirmMevShieldValue
            withMevShield={shield.withMevShield}
            isMevShieldDisabled={shield.isMevShieldDisabled}
            isMevShieldFeatureDisabled={shield.isMevShieldFeatureDisabled}
            setIsMevProtectionEnabled={shield.setIsMevProtectionEnabled}
          />
        </SwapTxRow>
      ) : null}
    </>
  )

  const costs = (
    <>
      {feeRows}
      <SwapOtherFees
        fees={fees}
        isLoading={feesLoading}
        label={
          <BittensorConfirmTalismanFeeLabel
            netuid={data.netuid}
            containerId={containerId}
            direction={data.direction === "stake" ? "taoToAlpha" : "alphaToTao"}
            onCloseModal={close}
          />
        }
      />
      {children}
    </>
  )

  if (layout === "cards")
    return (
      <>
        <Card>{position}</Card>
        <Card>{pricing}</Card>
        <Card className="px-4 py-3">{costs}</Card>
      </>
    )

  return (
    <>
      {provider ? (
        <SwapTxRow label={t("Provider")}>
          <img src={provider.logo || undefined} alt="" className="size-10 shrink-0 rounded-full" />
          <span className="truncate">{provider.name}</span>
        </SwapTxRow>
      ) : null}
      {position}
      <Separator />
      {pricing}
      <Separator />
      {costs}
    </>
  )
}
