import { TokenId } from "@talismn/chaindata-provider"
import { InfoIcon, LoaderIcon } from "@talismn/icons"
import { uniq } from "lodash"
import { FC, Suspense, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { AccountJsonQr, AccountJsonSignet, AccountType } from "@extension/core"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { useFeeToken } from "@ui/domains/SendFunds/useFeeToken"
import { QrSubstrate } from "@ui/domains/Sign/Qr/QrSubstrate"
import { SignAlertMessage } from "@ui/domains/Sign/SignAlertMessage"
import { SignHardwareSubstrate } from "@ui/domains/Sign/SignHardwareSubstrate"
import { usePolkadotSigningRequest } from "@ui/domains/Sign/SignRequestContext"
import { SignSignetSubstrate } from "@ui/domains/Sign/SignSignetSubstrate"
import { getMultiLocationTokenId } from "@ui/domains/Sign/Substrate/util/getMultiLocationTokenId"
import { useBalancesByParams } from "@ui/hooks/useBalancesByParams"
import { useTokensMap } from "@ui/state"

export const FooterContent = ({ isTransaction = false }: { isTransaction?: boolean }) => {
  const { t } = useTranslation("request")
  const {
    fee,
    request,
    payload,
    approve,
    reject,
    account,
    chain,
    approveHardware,
    approveQr,
    approveSignet,
    status,
    registry,
    shortMetadata,
  } = usePolkadotSigningRequest()

  const processing = useMemo(() => status === "PROCESSING", [status])

  if (!account || !request) return null
  return (
    <>
      {account.origin === AccountType.Watched && (
        <SignAlertMessage className="mb-6" type="error">
          {t("Cannot sign with a watch-only account.")}
        </SignAlertMessage>
      )}
      {isTransaction && (
        <>
          <DryRunError />
          <EstimatedFeesRow />
        </>
      )}
      {(() => {
        switch (account.origin) {
          case AccountType.Dcent:
          case AccountType.Ledger:
          case // @ts-expect-error incomplete migration, remove once migration is completed
          "HARDWARE":
            return (
              <Suspense fallback={null}>
                <SignHardwareSubstrate
                  fee={isTransaction ? fee?.toString() : undefined}
                  payload={payload}
                  onSigned={approveHardware}
                  onCancel={reject}
                  containerId="main"
                  registry={registry}
                  shortMetadata={shortMetadata}
                />
              </Suspense>
            )
          case AccountType.Qr:
            return (
              <Suspense fallback={null}>
                <QrSubstrate
                  payload={payload}
                  account={account as AccountJsonQr}
                  genesisHash={chain?.genesisHash ?? account?.genesisHash ?? undefined}
                  onSignature={approveQr}
                  onReject={reject}
                  containerId="main"
                />
              </Suspense>
            )
          case AccountType.Signet:
            return (
              <SignSignetSubstrate
                account={account as AccountJsonSignet}
                payload={payload}
                onApprove={approveSignet}
                onCancel={reject}
              />
            )
          case AccountType.Talisman:
          default:
            return (
              <div className="grid w-full grid-cols-2 gap-12">
                <Button disabled={processing} onClick={reject}>
                  {t("Cancel")}
                </Button>
                <Button
                  processing={processing}
                  primary
                  disabled={account.origin === AccountType.Watched}
                  onClick={approve}
                >
                  {t("Approve")}
                </Button>
              </div>
            )
        }
      })()}
    </>
  )
}

const DryRunError: FC = () => {
  const { t } = useTranslation("request")
  const { dryRun } = usePolkadotSigningRequest()

  if (!dryRun?.errorMessage) return null

  return (
    <SignAlertMessage className="mb-6" type="error">
      {t("This transaction is likely to fail:")}
      <br />
      {dryRun.errorMessage}
    </SignAlertMessage>
  )
}

type FeeDetails = {
  label: string
  plancks: bigint
  tokenId: TokenId
  balance: bigint | null
}

type FeeDetailsRow = { label: string; tokenId: string; plancks: bigint }

const EstimatedFeesRow: FC = () => {
  const { t } = useTranslation("request")
  const {
    fee,
    isLoadingFee,
    errorFee,
    chain,
    errorDecodingExtrinsic,
    signingRequest,
    dryRun,
    dryRunIsLoading,
  } = usePolkadotSigningRequest()
  const tokens = useTokensMap()

  const feeToken = useFeeToken(chain?.nativeToken?.id)

  const deliveryFees = useMemo<FeeDetails[]>(() => {
    if (!chain?.nativeToken?.id || !dryRun?.ok || !dryRun.data.success) return []

    const fees: { plancks: bigint; tokenId: TokenId }[] = []

    for (const e of dryRun.data.value.emitted_events) {
      if (
        (e.type === "XcmPallet" || e.type === "PolkadotXcm" || e.type === "CumulusXcm") &&
        e.value.type === "FeesPaid"
      )
        for (const fee of e.value.value.fees) {
          if (fee.fun.type === "NonFungible") continue

          const plancks = fee.fun.value
          const tokenId = getMultiLocationTokenId(fee.id, chain, tokens)
          if (!tokenId || !plancks) continue

          fees.push({ plancks, tokenId })
        }
    }

    return fees.map(
      (fee): FeeDetails => ({
        label: t("XCM Delivery Fee:"),
        plancks: fee.plancks,
        tokenId: fee.tokenId,
        balance: null,
      }),
    )
  }, [chain, dryRun, t, tokens])

  const allBalances = useBalancesByParams(
    useMemo(
      () => ({
        addressesAndTokens: {
          addresses: [signingRequest?.account?.address ?? ""].filter(Boolean),
          tokenIds:
            deliveryFees
              ?.map((fee) => fee.tokenId)
              .concat(feeToken?.id ?? "")
              .filter(Boolean) ?? [],
        },
      }),
      [deliveryFees, signingRequest?.account?.address, feeToken?.id],
    ),
  )

  const fees = useMemo<FeeDetails[]>(() => {
    const deliveryFeesWithBalances = deliveryFees.map((fee) => ({
      ...fee,
      balance:
        allBalances.balances.find({ tokenId: fee.tokenId }).each[0]?.transferable.planck ?? null,
    }))

    const executionFee =
      fee && feeToken?.id
        ? [
            {
              label: t("Execution fee:"),
              plancks: fee,
              tokenId: feeToken.id,
              balance:
                allBalances.balances.find({ tokenId: feeToken.id }).each[0]?.transferable.planck ??
                null,
            },
          ]
        : []

    return [...deliveryFeesWithBalances, ...executionFee]
  }, [deliveryFees, fee, feeToken?.id, t, allBalances])

  const estimatedFee = useMemo(
    () =>
      fees
        .filter((fee) => fee.tokenId === feeToken?.id)
        .reduce((acc, fee) => acc + fee.plancks, 0n),
    [fees, feeToken?.id],
  )

  return (
    <div className="text-body-secondary mb-8 flex w-full items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <Tooltip placement="top-start">
          <TooltipTrigger asChild>
            <div>
              {t("Estimated Fee")} <InfoIcon className="inline-block align-text-top text-[1.1em]" />
            </div>
          </TooltipTrigger>
          {(!!fees.length || !!chain?.isUnknownFeeToken) && (
            <TooltipContent>
              <FeeInfo isUnknownFeeToken={chain?.isUnknownFeeToken} fees={fees} />
            </TooltipContent>
          )}
        </Tooltip>
      </div>
      <div>
        {isLoadingFee || dryRunIsLoading ? (
          <LoaderIcon className="animate-spin-slow inline-block" />
        ) : errorFee || errorDecodingExtrinsic ? (
          <Tooltip placement="bottom-end">
            <TooltipTrigger type="button">{t("Unknown")}</TooltipTrigger>
            <TooltipContent>{t("Failed to compute fee")}</TooltipContent>
          </Tooltip>
        ) : (
          <TokensAndFiat planck={estimatedFee} tokenId={feeToken?.id} />
        )}
      </div>
    </div>
  )
}

const FeeInfo = ({
  fees,
  isUnknownFeeToken,
}: {
  fees?: FeeDetails[]
  isUnknownFeeToken?: boolean
}) => {
  const { t } = useTranslation("request")

  // extract unique balances and display them at the end
  const feeRows = useMemo<{ label: string; tokenId: string; plancks: bigint }[]>(() => {
    if (!fees?.length) return []

    const balances = uniq(
      fees?.filter((fee) => typeof fee.balance === "bigint").map((fee) => fee.tokenId),
    )
      .map((tokenId) => {
        const fee = fees?.find((fee) => fee.tokenId === tokenId && typeof fee.balance === "bigint")
        return { label: t("Balance:"), tokenId, plancks: fee?.balance }
      })
      .filter((fee) => typeof fee.plancks === "bigint") as FeeDetailsRow[]

    return [...fees, ...balances]
  }, [fees, t])

  if (!feeRows.length) return null

  return (
    <TooltipContent>
      <div className="flex flex-col gap-2 whitespace-nowrap text-sm">
        {feeRows.map((row, idx) => (
          <div key={`${row.tokenId}-${idx}`} className="flex w-full justify-between gap-8">
            <div>{row.label}</div>
            <div>
              <TokensAndFiat tokenId={row.tokenId} planck={row.plancks} noTooltip noCountUp />
            </div>
          </div>
        ))}

        {isUnknownFeeToken && (
          <div className="whitespace-normal">
            {t("We are unable to detect which currency will be used for fees in this transaction.")}
          </div>
        )}
      </div>
    </TooltipContent>
  )
}
