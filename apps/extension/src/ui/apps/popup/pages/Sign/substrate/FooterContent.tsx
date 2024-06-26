import { AccountJsonQr, AccountJsonSignet, AccountType } from "@extension/core"
import { InfoIcon, LoaderIcon } from "@talismn/icons"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { useFeeToken } from "@ui/domains/SendFunds/useFeeToken"
import { QrSubstrate } from "@ui/domains/Sign/Qr/QrSubstrate"
import { SignHardwareSubstrate } from "@ui/domains/Sign/SignHardwareSubstrate"
import { usePolkadotSigningRequest } from "@ui/domains/Sign/SignRequestContext"
import { SignSignetSubstrate } from "@ui/domains/Sign/SignSignetSubstrate"
import { FC, Suspense, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

const EstimatedFeesRow: FC = () => {
  const { t } = useTranslation("request")
  const { fee, isLoadingFee, errorFee, chain, errorDecodingExtrinsic } = usePolkadotSigningRequest()
  const feeToken = useFeeToken(chain?.nativeToken?.id)

  return (
    <div className="text-body-secondary mb-8 flex w-full items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <span>{t("Estimated Fee")} </span>
        {!!chain?.isUnknownFeeToken && (
          <Tooltip>
            <TooltipTrigger className="flex flex-col justify-center">
              <InfoIcon className="inline-block" />
            </TooltipTrigger>
            <TooltipContent>
              {t(
                "We are unable to detect which currency will be used for fees in this transaction."
              )}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <div>
        {isLoadingFee ? (
          <LoaderIcon className="animate-spin-slow inline-block" />
        ) : errorFee || errorDecodingExtrinsic ? (
          <Tooltip placement="bottom-end">
            <TooltipTrigger>{t("Unknown")}</TooltipTrigger>
            <TooltipContent>{t("Failed to compute fee")}</TooltipContent>
          </Tooltip>
        ) : (
          <TokensAndFiat planck={fee ?? undefined} tokenId={feeToken?.id} />
        )}
      </div>
    </div>
  )
}

export const FooterContent = ({ withFee = false }: { withFee?: boolean }) => {
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
      {withFee && <EstimatedFeesRow />}
      {(() => {
        switch (account.origin) {
          case AccountType.Dcent:
          case AccountType.Ledger:
          case // @ts-expect-error incomplete migration, remove once migration is completed
          "HARDWARE":
            return (
              <Suspense fallback={null}>
                <SignHardwareSubstrate
                  fee={withFee ? fee?.toString() : undefined}
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
                <Button processing={processing} primary onClick={approve}>
                  {t("Approve")}
                </Button>
              </div>
            )
        }
      })()}
    </>
  )
}
